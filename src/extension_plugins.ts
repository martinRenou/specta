import { spectaDocument, spectaOpener } from './document/plugin';
import { spectaLayoutRegistry } from './layout';
import { appMeta, cellMeta } from './metadata';

export * from './tool';
export * from './token';

export default [
  spectaDocument,
  spectaOpener,
  spectaLayoutRegistry,
  appMeta,
  cellMeta
];
