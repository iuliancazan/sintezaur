import type { SlideDef } from '../../types';
import { courseMapSvg, SHORT_COURSE_NODES, swapCourseMap } from './course-map';
import { SLIDE_S09_01_THE_ROAD_AGAIN } from './s09-01-the-road-again';

// "The road, again" for the short cut: six lit nodes instead of eight.
const MAP = courseMapSvg(SHORT_COURSE_NODES, 'road');

export const SLIDE_S09_01_THE_ROAD_AGAIN_SHORT: SlideDef = {
  id: '09·01',
  module: '09',
  label: 'The Road Again',
  en: swapCourseMap(SLIDE_S09_01_THE_ROAD_AGAIN.en, MAP),
  ro: swapCourseMap(SLIDE_S09_01_THE_ROAD_AGAIN.ro, MAP),
};
