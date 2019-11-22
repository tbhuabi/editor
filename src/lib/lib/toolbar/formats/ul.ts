import { ButtonConfig, HandlerType, Priority } from '../help';
import { ListCommander } from '../../commands/list-commander';

export const ulHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-list'],
  priority: Priority.Block,
  tooltip: '无序列表',
  editable: {
    tag: true
  },
  match: {
    tags: ['ul']
  },
  execCommand: new ListCommander('ul')
};