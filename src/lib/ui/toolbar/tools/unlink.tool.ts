import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';
import { linkFormatter } from '../../../formatter/link.formatter';
import { PreComponent } from '../../../components/pre.component';
import { UnlinkCommander } from '../commands/unlink.commander';
import { UnlinkMatcher } from '../matcher/unlink.matcher';

export const unlinkToolConfig: ButtonToolConfig = {
  tooltip: i18n => i18n.get('plugins.toolbar.unlinkTool.tooltip'),
  iconClasses: ['textbus-icon-unlink'],
  matcher: new UnlinkMatcher(linkFormatter, [PreComponent]),
  commanderFactory() {
    return new UnlinkCommander();
  }
};
export const unlinkTool = new ButtonTool(unlinkToolConfig);
