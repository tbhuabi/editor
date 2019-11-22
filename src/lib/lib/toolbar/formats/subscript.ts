import { ButtonConfig, HandlerType, Priority } from '../help';
import { InlineCommander } from '../../commands/inline-commander';

export const subscriptHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-subscript'],
  priority: Priority.Inline,
  tooltip: '下标',
  editable: {
    tag: true
  },
  match: {
    tags: ['sub']
  },
  execCommand: new InlineCommander('sub')
};