import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  // Register the tree data provider for the sidebar
  const flowChartTreeProvider = new FlowChartTreeProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('flowChartSidebar', flowChartTreeProvider)
  );

  // Register command to open the flow chart in editor
  const openCommand = vscode.commands.registerCommand(
    'chart-vscode-ext.openFlow',
    (item) => {
      FlowChartPanel.createOrShow(context.extensionUri, item);
    }
  );

  // Register command to open Prisma schema visualization
  const openPrismaCommand = vscode.commands.registerCommand(
    'chart-vscode-ext.openPrisma',
    async (filePath?: string) => {
      let schemaContent: string | undefined;
      let actualFilePath: string | undefined;

      if (filePath) {
        // Load from specific file path
        const uri = vscode.Uri.file(filePath);
        const content = await vscode.workspace.fs.readFile(uri);
        schemaContent = Buffer.from(content).toString('utf8');
        actualFilePath = filePath;
      } else {
        // Try to find schema.prisma in workspace
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
          for (const folder of workspaceFolders) {
            const possiblePaths = [
              vscode.Uri.joinPath(folder.uri, 'prisma', 'schema.prisma'),
              vscode.Uri.joinPath(folder.uri, 'schema.prisma'),
            ];

            for (const path of possiblePaths) {
              try {
                await vscode.workspace.fs.stat(path);
                const content = await vscode.workspace.fs.readFile(path);
                schemaContent = Buffer.from(content).toString('utf8');
                actualFilePath = path.fsPath;
                break;
              } catch {
                // File doesn't exist, continue
              }
            }

            if (schemaContent) break;
          }
        }

        // If not found, show file picker
        if (!schemaContent) {
          const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            openLabel: 'Select Prisma Schema',
            filters: {
              'Prisma Files': ['prisma']
            }
          };

          const fileUri = await vscode.window.showOpenDialog(options);
          if (fileUri && fileUri[0]) {
            const content = await vscode.workspace.fs.readFile(fileUri[0]);
            schemaContent = Buffer.from(content).toString('utf8');
            actualFilePath = fileUri[0].fsPath;
          }
        }
      }

      if (schemaContent) {
        // Create a unique label based on the file name
        const fileName = actualFilePath ? actualFilePath.split('/').pop() || actualFilePath.split('\\').pop() : 'Schema';
        const label = `Prisma: ${fileName}`;

        FlowChartPanel.createOrShow(
          context.extensionUri,
          new ChartItemData('prisma', label, { schema: schemaContent, filePath: actualFilePath })
        );
      }
    }
  );

  // Register command to save current schema as YAML
  const saveYamlCommand = vscode.commands.registerCommand(
    'chart-vscode-ext.saveAsYaml',
    async () => {
      // Get the most recently active panel
      const activePanel = Array.from(FlowChartPanel.panels.values()).pop();

      if (!activePanel) {
        vscode.window.showWarningMessage('No schema panel is currently open');
        return;
      }

      const saveUri = await vscode.window.showSaveDialog({
        filters: {
          'YAML Files': ['yml', 'yaml']
        },
        defaultUri: vscode.Uri.file('schema.yml'),
        saveLabel: 'Save as YAML'
      });

      if (saveUri) {
        // Notify webview to send current schema data
        activePanel.sendSaveYamlRequest(saveUri.fsPath);
      }
    }
  );

  // Register command to open YAML schema
  const openYamlCommand = vscode.commands.registerCommand(
    'chart-vscode-ext.openYaml',
    async (filePath?: string) => {
      let yamlContent: string | undefined;
      let actualFilePath: string | undefined;

      if (filePath) {
        const uri = vscode.Uri.file(filePath);
        const content = await vscode.workspace.fs.readFile(uri);
        yamlContent = Buffer.from(content).toString('utf8');
        actualFilePath = filePath;
      } else {
        const options: vscode.OpenDialogOptions = {
          canSelectMany: false,
          openLabel: 'Select YAML Schema',
          filters: {
            'YAML Files': ['yml', 'yaml']
          }
        };

        const fileUri = await vscode.window.showOpenDialog(options);
        if (fileUri && fileUri[0]) {
          const content = await vscode.workspace.fs.readFile(fileUri[0]);
          yamlContent = Buffer.from(content).toString('utf8');
          actualFilePath = fileUri[0].fsPath;
        }
      }

      if (yamlContent) {
        // Create a unique label based on the file name
        const fileName = actualFilePath ? actualFilePath.split('/').pop() || actualFilePath.split('\\').pop() : 'Schema';
        const label = `YAML: ${fileName}`;

        FlowChartPanel.createOrShow(
          context.extensionUri,
          new ChartItemData('yaml', label, { schema: yamlContent, filePath: actualFilePath })
        );
      }
    }
  );

  context.subscriptions.push(openCommand, openPrismaCommand, saveYamlCommand, openYamlCommand);
}

export function deactivate() {}

class FlowChartTreeProvider implements vscode.TreeDataProvider<ChartItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ChartItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ChartItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ChartItem): Thenable<ChartItem[]> {
    if (!element) {
      // Root level - show projects
      return Promise.resolve(this.getProjects());
    }
    return Promise.resolve(element.getChildren());
  }

  private getProjects(): ChartItem[] {
    return [
      new ChartItem(
        'My Project',
        vscode.TreeItemCollapsibleState.Collapsed,
        'project',
        {
          command: 'chart-vscode-ext.openFlow',
          title: 'Open Project',
          arguments: [new ChartItemData('project', 'My Project', {})]
        }
      ),
      new ChartItem(
        'Sample Project',
        vscode.TreeItemCollapsibleState.Collapsed,
        'project',
        {
          command: 'chart-vscode-ext.openFlow',
          title: 'Open Project',
          arguments: [new ChartItemData('project', 'Sample Project', {})]
        }
      )
    ];
  }
}

class ChartItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    private readonly itemType: string,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}`;
    this.contextValue = itemType;
    this.iconPath = this.getIcon();
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.itemType) {
      case 'project':
        return new vscode.ThemeIcon('folder-library');
      case 'folder':
        return new vscode.ThemeIcon('folder');
      case 'chart':
        return new vscode.ThemeIcon('graph');
      case 'prisma':
        return new vscode.ThemeIcon('database');
      case 'yaml':
        return new vscode.ThemeIcon('file-code');
      default:
        return new vscode.ThemeIcon('file');
    }
  }

  getChildren(): ChartItem[] {
    switch (this.itemType) {
      case 'project':
        return [
          new ChartItem(
            'Flows',
            vscode.TreeItemCollapsibleState.Collapsed,
            'folder'
          ),
          new ChartItem(
            'Diagrams',
            vscode.TreeItemCollapsibleState.Collapsed,
            'folder'
          )
        ];
      case 'folder':
        return this.getCharts();
      default:
        return [];
    }
  }

  private getCharts(): ChartItem[] {
    if (this.label === 'Flows') {
      return [
        new ChartItem(
          'Main Flow',
          vscode.TreeItemCollapsibleState.None,
          'chart',
          {
            command: 'chart-vscode-ext.openFlow',
            title: 'Open Flow',
            arguments: [new ChartItemData('chart', 'Main Flow', { id: 'main-flow' })]
          }
        ),
        new ChartItem(
          'Process Flow',
          vscode.TreeItemCollapsibleState.None,
          'chart',
          {
            command: 'chart-vscode-ext.openFlow',
            title: 'Open Flow',
            arguments: [new ChartItemData('chart', 'Process Flow', { id: 'process-flow' })]
          }
        )
      ];
    } else if (this.label === 'Diagrams') {
      return [
        new ChartItem(
          'Open Prisma Schema',
          vscode.TreeItemCollapsibleState.None,
          'prisma',
          {
            command: 'chart-vscode-ext.openPrisma',
            title: 'Open Prisma Schema',
          }
        ),
        new ChartItem(
          'Open YAML Schema',
          vscode.TreeItemCollapsibleState.None,
          'yaml',
          {
            command: 'chart-vscode-ext.openYaml',
            title: 'Open YAML Schema',
          }
        ),
        new ChartItem(
          'Architecture',
          vscode.TreeItemCollapsibleState.None,
          'chart',
          {
            command: 'chart-vscode-ext.openFlow',
            title: 'Open Diagram',
            arguments: [new ChartItemData('chart', 'Architecture', { id: 'architecture' })]
          }
        )
      ];
    }
    return [];
  }
}

class ChartItemData {
  constructor(
    public readonly type: string,
    public readonly label: string,
    public readonly metadata: { [key: string]: any }
  ) {}
}

class FlowChartPanel {
  public static readonly panels = new Map<string, FlowChartPanel>();
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _item?: ChartItemData;
  private _panelId: string;

  public static createOrShow(extensionUri: vscode.Uri, item?: ChartItemData) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // Generate a unique ID for this panel based on the item
    const panelId = item ? `${item.type}-${item.label}` : `default-${Date.now()}`;

    // Check if a panel for this schema already exists
    if (FlowChartPanel.panels.has(panelId)) {
      const existingPanel = FlowChartPanel.panels.get(panelId);
      existingPanel?._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'flowChart',
      item?.label || 'Flow Chart',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')],
        retainContextWhenHidden: true
      }
    );

    const flowChartPanel = new FlowChartPanel(panel, extensionUri, item, panelId);
    FlowChartPanel.panels.set(panelId, flowChartPanel);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, item?: ChartItemData, panelId?: string) {
    this._panel = panel;
    this._item = item;
    this._panelId = panelId || `default-${Date.now()}`;

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, extensionUri, item);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        console.log('Extension received message:', message.command);
        switch (message.command) {
          case 'requestSaveYaml':
            console.log('Showing save dialog...');
            // Show save dialog
            const saveUri = await vscode.window.showSaveDialog({
              filters: {
                'YAML Files': ['yml', 'yaml']
              },
              defaultUri: vscode.Uri.file('schema.yml'),
              saveLabel: 'Save as YAML'
            });

            console.log('Save dialog result:', saveUri?.fsPath);
            if (saveUri) {
              this._panel.webview.postMessage({
                command: 'saveAsYaml',
                filePath: saveUri.fsPath
              });
            } else {
              // User cancelled
              this._panel.webview.postMessage({ command: 'saveCancelled' });
            }
            break;
          case 'saveYaml':
            await this.saveYaml(message.data, message.filePath);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  private async saveYaml(yamlContent: string, filePath: string) {
    try {
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(filePath),
        Buffer.from(yamlContent, 'utf8')
      );
      vscode.window.showInformationMessage(`Schema saved to ${filePath}`);
      // Notify webview of success
      this._panel.webview.postMessage({ command: 'saveComplete' });
    } catch (error) {
      const errorMsg = `Failed to save YAML: ${error}`;
      vscode.window.showErrorMessage(errorMsg);
      // Notify webview of error
      this._panel.webview.postMessage({
        command: 'saveError',
        error: String(error)
      });
    }
  }

  public sendSaveYamlRequest(filePath: string) {
    this._panel.webview.postMessage({
      command: 'saveAsYaml',
      filePath
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri, item?: ChartItemData): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js')
    );

    // Pass initial data to the webview
    const initialData = {
      type: item?.type || 'default',
      prismaSchema: item?.type === 'prisma' ? item?.metadata?.schema : null,
      yamlSchema: item?.type === 'yaml' ? item?.metadata?.schema : null
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flow Chart</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }
    #root {
      height: 100%;
      width: 100%;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.vscode = acquireVsCodeApi();
    window.vscodeInitialData = ${JSON.stringify(initialData)};
  </script>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }

  public dispose() {
    FlowChartPanel.panels.delete(this._panelId);
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
