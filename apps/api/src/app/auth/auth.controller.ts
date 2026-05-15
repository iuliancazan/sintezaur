import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../common/storage.service';
import { Throttle, seconds } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import {
  CurrentUser,
  JwtAuthGuard,
  Public,
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  setAuthCookies,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import type { Request, Response } from 'express';
import { AuthService, type AuthUserPublic } from './auth.service';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

interface MeResponse {
  user: AuthUserPublic;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ── Public flows ─────────────────────────────────────────────────────

  @Public()
  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() body: SignupDto): Promise<{ userId: string }> {
    return this.auth.signup({
      email: body.email,
      password: body.password,
      username: body.username,
      fullName: body.fullName,
    });
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() body: VerifyEmailDto): Promise<{ verified: boolean }> {
    return this.auth.verifyEmail(body.token);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: seconds(60) } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse> {
    const { tokens, user } = await this.auth.login(
      body.email,
      body.password,
      requestMeta(req),
    );
    setAuthCookies(res, this.config, tokens);
    return { user };
  }

  /**
   * Cookie-based refresh — reads `sintezaur_refresh` HttpOnly cookie,
   * rotates it, and sets the new pair. No request body. Returns the
   * fresh user payload so the SPA can resync state in the same call.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse> {
    const presented = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!presented) {
      clearAuthCookies(res, this.config);
      throw new (await import('@nestjs/common')).UnauthorizedException();
    }
    const { tokens, user } = await this.auth.refresh(
      presented,
      requestMeta(req),
    );
    setAuthCookies(res, this.config, tokens);
    return { user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const presented = req.cookies?.[REFRESH_COOKIE_NAME];
    await this.auth.logout(presented);
    clearAuthCookies(res, this.config);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: seconds(60) } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: ForgotPasswordDto): Promise<{ sent: boolean }> {
    return this.auth.requestPasswordReset(body.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body() body: ResetPasswordDto,
  ): Promise<{ reset: boolean }> {
    return this.auth.resetPassword(body.token, body.password);
  }

  // ── Authenticated flows ──────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponse> {
    return { user: await this.auth.getById(user.sub) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse> {
    const next = await this.auth.changePassword(
      user.sub,
      body.currentPassword,
      body.newPassword,
    );
    // changePassword revokes all sessions — clear cookies so the SPA
    // knows it has to re-auth even though the same browser tab is open.
    clearAuthCookies(res, this.config);
    return { user: next };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  @HttpCode(HttpStatus.OK)
  changeEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangeEmailDto,
  ): Promise<{ sent: boolean }> {
    return this.auth.requestEmailChange(
      user.sub,
      body.currentPassword,
      body.newEmail,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateProfileDto,
  ): Promise<MeResponse> {
    return { user: await this.auth.updateProfile(user.sub, body) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: StorageService.MAX_INPUT_BYTES },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MeResponse> {
    return { user: await this.auth.setAvatar(user.sub, file) };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  async removeAvatar(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MeResponse> {
    return { user: await this.auth.removeAvatar(user.sub) };
  }
}

function requestMeta(req: Request): {
  ip: string | null;
  userAgent: string | null;
} {
  const xff = req.headers['x-forwarded-for'];
  const ip =
    (Array.isArray(xff) ? xff[0] : xff?.split(',')[0]?.trim()) ??
    req.ip ??
    null;
  const userAgent = req.headers['user-agent'] ?? null;
  return { ip, userAgent };
}
