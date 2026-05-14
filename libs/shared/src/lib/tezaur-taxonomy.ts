/**
 * Tezaur taxonomy constants per spec §8.1.
 *
 * Type literal arrays mirror the Drizzle enum values so the FE can
 * import without depending on @sintezaur/db (which pulls drizzle-orm +
 * pg, not browser-safe).
 */

export const GEAR_CATEGORIES = [
  'synthesizer',
  'drum_machine',
  'sampler',
  'sequencer',
  'effect',
  'midi_controller',
  'eurorack_module',
  'eurorack_case',
  'audio_interface',
  'mixer',
  'monitor',
  'headphones',
  'microphone',
  'recorder',
  'software_synth',
  'software_fx',
  'daw',
  'accessory',
] as const;
export type GearCategoryLiteral = (typeof GEAR_CATEGORIES)[number];

export const FORM_FACTORS = [
  'desktop',
  'keyboard',
  'pedal',
  'rack_unit',
  'eurorack',
  'module',
  'standalone',
  'software',
] as const;
export type FormFactorLiteral = (typeof FORM_FACTORS)[number];

/* Per-category `type` sub-enums per spec §8.1. */

export const SYNTH_TYPES = [
  'analog_mono',
  'analog_poly',
  'analog_paraphonic',
  'digital',
  'virtual_analog',
  'hybrid',
  'fm',
  'wavetable',
  'modular_voice',
  'drone',
  'other',
] as const;
export type SynthType = (typeof SYNTH_TYPES)[number];

export const DRUM_MACHINE_TYPES = [
  'analog',
  'digital',
  'sample_based',
  'hybrid',
  'groovebox',
] as const;
export type DrumMachineType = (typeof DRUM_MACHINE_TYPES)[number];

export const SAMPLER_TYPES = [
  'pad_based',
  'keyboard_based',
  'phrase_sampler',
  'mpc_style',
  'groovebox',
  'other',
] as const;
export type SamplerType = (typeof SAMPLER_TYPES)[number];

/** Shared between `effect.type` and `software_fx.type`. */
export const EFFECT_TYPES = [
  'reverb',
  'delay',
  'modulation',
  'distortion',
  'filter',
  'multi_fx',
  'pitch_shift',
  'dynamics',
  'eq',
  'utility',
  'other',
] as const;
export type EffectType = (typeof EFFECT_TYPES)[number];

export const MIDI_CONTROLLER_TYPES = [
  'keyboard',
  'pad',
  'fader_bank',
  'dj',
  'wind',
  'grid',
  'hybrid',
] as const;
export type MidiControllerType = (typeof MIDI_CONTROLLER_TYPES)[number];

export const EURORACK_MODULE_TYPES = [
  'vco',
  'vcf',
  'vca',
  'lfo',
  'envelope',
  'sequencer',
  'utility',
  'mixer',
  'effect',
  'sampler',
  'drum',
  'clock',
  'other',
] as const;
export type EurorackModuleType = (typeof EURORACK_MODULE_TYPES)[number];

/**
 * Categories that have a `type` sub-enum vs. those that don't.
 * Categories without a sub-enum store `specs = {}` (all detail in the
 * editorial description).
 */
export const CATEGORIES_WITH_TYPE: ReadonlyArray<GearCategoryLiteral> = [
  'synthesizer',
  'drum_machine',
  'sampler',
  'effect',
  'software_fx',
  'midi_controller',
  'eurorack_module',
];

/* Personal-collection statuses (spec §8.1). */
export const USER_GEAR_STATUS_FLAGS = [
  'owned',
  'wishlist',
  'wanted',
  'used_to_own',
  'loaned_out',
] as const;
export type UserGearStatusFlagLiteral =
  (typeof USER_GEAR_STATUS_FLAGS)[number];

/* Typed gear relationships (spec §8.1). */
export const GEAR_RELATIONSHIP_TYPES = [
  'successor',
  'variant',
  'inspired_by',
  'based_on',
  'replaces',
] as const;
export type GearRelationshipTypeLiteral =
  (typeof GEAR_RELATIONSHIP_TYPES)[number];

/* Image variants (lock with libs/db enum). */
export const IMAGE_VARIANTS = [
  'square_thumb',
  'square_medium',
  'landscape_4x3_medium',
  'landscape_4x3_large',
  'landscape_16x9_medium',
  'landscape_16x9_large',
  'original',
] as const;
export type ImageVariantLiteral = (typeof IMAGE_VARIANTS)[number];

/** Per-variant dimensions (longest side, in px) used by the Sharp pipeline. */
export const IMAGE_VARIANT_SIZES: Record<
  Exclude<ImageVariantLiteral, 'original'>,
  { width: number; height: number; aspect: '1:1' | '4:3' | '16:9' }
> = {
  square_thumb: { width: 400, height: 400, aspect: '1:1' },
  square_medium: { width: 800, height: 800, aspect: '1:1' },
  landscape_4x3_medium: { width: 800, height: 600, aspect: '4:3' },
  landscape_4x3_large: { width: 1600, height: 1200, aspect: '4:3' },
  landscape_16x9_medium: { width: 1200, height: 675, aspect: '16:9' },
  landscape_16x9_large: { width: 1920, height: 1080, aspect: '16:9' },
};
