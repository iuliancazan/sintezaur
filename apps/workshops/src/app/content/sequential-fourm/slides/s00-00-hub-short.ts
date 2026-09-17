import type { SlideDef } from '../../types';
import { courseMapSvg, SHORT_COURSE_NODES, swapCourseMap } from './course-map';
import { SLIDE_S00_00_HUB } from './s00-00-hub';

// The short cut's course map: the 00 Hub slide with a six-node road (the
// same id, so every "← COURSE MAP" link keeps working).
const MAP = courseMapSvg(SHORT_COURSE_NODES, 'hub');

export const SLIDE_S00_00_HUB_SHORT: SlideDef = {
  id: 'hub',
  module: 'hub',
  label: 'Course map (hub)',
  en: swapCourseMap(SLIDE_S00_00_HUB.en, MAP),
  ro: swapCourseMap(SLIDE_S00_00_HUB.ro, MAP),
};
