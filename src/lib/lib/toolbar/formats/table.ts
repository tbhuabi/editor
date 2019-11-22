import { Subject } from 'rxjs';

import { Form } from './forms/form';
import { AttrState, AttrType } from './forms/help';
import { DropdownConfig, HandlerType, Priority } from '../help';
import { TableCommander } from '../../commands/table-commander';

const form = new Form([{
  type: AttrType.TextField,
  required: true,
  name: 'rows',
  label: '表格行数',
  placeholder: '请输入表格行数'
}, {
  type: AttrType.TextField,
  required: true,
  name: 'cols',
  label: '表格列数',
  placeholder: '请输入表格列数'
}, {
  type: AttrType.Switch,
  label: '添加表头',
  required: true,
  checked: false,
  name: 'header'
}]);

const updateEvent = new Subject<AttrState[]>();
const hideEvent = new Subject<void>();

form.onSubmit = function (attrs) {
  updateEvent.next(attrs);
  hideEvent.next();
};

export const tableHandler: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-table'],
  priority: Priority.Block,
  tooltip: '表格',
  onHide: hideEvent.asObservable(),
  viewer: form,
  editable: {
    tag: true
  },
  execCommand: new TableCommander(updateEvent.asObservable())
};