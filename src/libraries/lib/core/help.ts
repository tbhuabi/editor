import { Matcher } from './matcher';
import { Template } from './template';

export interface Plugin {
  matcher: Matcher;
  getViewTemplate(): Template;
}
