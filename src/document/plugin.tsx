import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  IThemeManager,
  IWidgetTracker,
  ReactWidget,
  WidgetTracker
} from '@jupyterlab/apputils';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { PathExt } from '@jupyterlab/coreutils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IKernelSpecManager } from '@jupyterlab/services';
import { Widget } from '@lumino/widgets';
import { TopbarElement } from '../topbar/widget';

import {
  ISpectaDocTracker,
  ISpectaLayoutRegistry,
  ISpectaShell
} from '../token';
import {
  createFileBrowser,
  hideAppLoadingIndicator,
  isSpectaApp,
  readSpectaConfig,
  registerDocumentFactory
} from '../tool';
import * as React from 'react';


const activate = (
  app: JupyterFrontEnd<ISpectaShell>,
  rendermime: IRenderMimeRegistry,
  tracker: INotebookTracker,
  editorServices: IEditorServices,
  contentFactory: NotebookPanel.IContentFactory,
  spectaLayoutRegistry: ISpectaLayoutRegistry,
  themeManager: IThemeManager
): IWidgetTracker => {
  const namespace = 'specta';
  const spectaTracker = new WidgetTracker<Widget>({ namespace });

  registerDocumentFactory({
    factoryName: 'specta',
    app,
    rendermime,
    tracker,
    editorServices,
    contentFactory,
    spectaTracker,
    spectaLayoutRegistry,
    themeManager
  });

  return spectaTracker;
};

export const spectaDocument: JupyterFrontEndPlugin<
  IWidgetTracker,
  ISpectaShell
> = {
  id: 'specta:notebook-doc',
  autoStart: true,
  requires: [
    IRenderMimeRegistry,
    INotebookTracker,
    IEditorServices,
    NotebookPanel.IContentFactory,
    ISpectaLayoutRegistry,
    IThemeManager
  ],
  activate,
  provides: ISpectaDocTracker
};

export const spectaOpener: JupyterFrontEndPlugin<void> = {
  id: 'specta/application-extension:opener',
  autoStart: true,
  requires: [
    IDocumentManager,
    IDefaultFileBrowser,
    IThemeManager,
    ISpectaLayoutRegistry,
    ISpectaDocTracker,
    IKernelSpecManager,
  ],
  activate: async (
    app: JupyterFrontEnd,
    docManager: IDocumentManager,
    defaultBrowser: IDefaultFileBrowser,
    themeManager: IThemeManager,
    spectaLayoutRegistry: ISpectaLayoutRegistry
  ): Promise<void> => {
    if (!isSpectaApp()) {
      // Not a specta app, return
      return;
    }

    const shell = app.shell as ISpectaShell;

    const urlParams = new URLSearchParams(window.location.search);
    const path = urlParams.get('path');

    // Create topbar
    // TODO Handle notebook case
    const config = readSpectaConfig({ nbPath: path });
    if (!config.hideTopbar) {
      shell.hideTopBar();
    } else {
      const widget = ReactWidget.create(
        <TopbarElement
          config={config.topBar}
          themeManager={themeManager}
          layoutRegistry={spectaLayoutRegistry}
        />
      );
      widget.id = 'specta-topbar-widget';
      widget.addClass('specta-topbar-element');

      shell.add(widget, 'top');
      if (widget.parent) {
        widget.parent.node.style.boxShadow =
          'rgba(0 0 0 / 20%) 0 2px 4px -1px, rgba(0 0 0 / 14%) 0 4px 5px 0, rgba(0 0 0 / 12%) 0 1px 10px 0';
      }
    }

    if (!path) {
      const browser = createFileBrowser({ defaultBrowser });
      shell.add(browser, 'main', { rank: 100 });
      hideAppLoadingIndicator();
    } else {
      if (PathExt.extname(path) === '.ipynb') {
        shell.addClass('specta-document-viewer');
        const widget = docManager.openOrReveal(path, 'specta');
        if (widget) {
          shell.add(widget, 'main');
        }
      } else {
        let count = 0;
        const tryOpen = () => {
          const widget = docManager.openOrReveal(path, 'default');
          if (widget) {
            shell.add(widget, 'main');
            hideAppLoadingIndicator();
          } else {
            count++;
            if (count > 10) {
              console.error('Failed to open file', path);
              const widget = new Widget();
              widget.node.innerHTML = `<h2 style="text-align: center; margin-top: 200px;">Failed to open file ${path}</h2>`;
              shell.add(widget, 'main');
              hideAppLoadingIndicator();
              return;
            }
            setTimeout(tryOpen, 100);
          }
        };
        tryOpen();
      }
    }
  }
};
