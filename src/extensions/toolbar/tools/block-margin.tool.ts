import { Form, FormTextField } from '../../_utils/forms/_api';
import { FormatMatcher } from '../matcher/format.matcher';
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api';
import { PreComponent } from '../../../lib/components/pre.component';
import { blockMarginFormatter } from '../../../lib/formatter/margin.formatter';
import { BlockMarginCommander } from '../commands/_api';

export const blockMarginToolConfig: DropdownToolConfig = {
  label: i18n => i18n.get('plugins.toolbar.blockMarginTool.label'),
  tooltip: i18n => i18n.get('plugins.toolbar.blockMarginTool.tooltip'),
  viewFactory(i18n) {
    const childI18n = i18n.getContext('plugins.toolbar.blockMarginTool.view');
    return new Form({
      mini: true,
      editProperty: 'styles',
      cancelBtnText: childI18n.get('cancelBtnText'),
      confirmBtnText: childI18n.get('confirmBtnText'),
      items: [
        new FormTextField({
          label: childI18n.get('topLabel'),
          name: 'marginTop',
          placeholder: childI18n.get('topPlaceholder')
        }),
        new FormTextField({
          label: childI18n.get('rightLabel'),
          name: 'marginRight',
          placeholder: childI18n.get('rightPlaceholder')
        }),
        new FormTextField({
          label: childI18n.get('bottomLabel'),
          name: 'marginBottom',
          placeholder: childI18n.get('bottomPlaceholder')
        }),
        new FormTextField({
          label: childI18n.get('leftLabel'),
          name: 'marginLeft',
          placeholder: childI18n.get('leftPlaceholder')
        }),
      ]
    });
  },
  matcher: new FormatMatcher(blockMarginFormatter, [PreComponent]),
  commanderFactory() {
    return new BlockMarginCommander(blockMarginFormatter)
  }
};
export const blockMarginTool = new DropdownTool(blockMarginToolConfig);