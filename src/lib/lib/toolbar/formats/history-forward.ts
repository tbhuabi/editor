import { ButtonConfig, HandlerType, Priority } from '../help';
import { HistoryCommander } from '../../commands/history-commander';
import { HistoryMatcher } from '../../matcher/history-matcher';

export const historyForwardHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-history-forward'],
  tooltip: '重做',
  priority: Priority.Block,
  editable: null,
  match: new HistoryMatcher('forward'),
  execCommand: new HistoryCommander('forward')
};