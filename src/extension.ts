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
    async (uri?: vscode.Uri) => {
      let schemaContent: string | undefined;
      let actualFilePath: string | undefined;

      if (uri) {
        // Load from specific file path (from explorer context menu)
        const fileUri = typeof uri === 'string' ? vscode.Uri.file(uri) : uri;
        const content = await vscode.workspace.fs.readFile(fileUri);
        schemaContent = Buffer.from(content).toString('utf8');
        actualFilePath = fileUri.fsPath;
      } else {
        // Get the first workspace folder as the default path
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        // Show file picker
        const options: vscode.OpenDialogOptions = {
          canSelectMany: false,
          openLabel: 'Select Prisma Schema',
          defaultUri: workspaceFolder?.uri,
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

      // Get the first workspace folder as the default path
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const defaultUri = workspaceFolder ? vscode.Uri.joinPath(workspaceFolder.uri, 'schema.cryml') : vscode.Uri.file('schema.cryml');

      const saveUri = await vscode.window.showSaveDialog({
        filters: {
          'Cryml Files': ['cryml'],
          'YAML Files': ['yml', 'yaml']
        },
        defaultUri,
        saveLabel: 'Save as Cryml'
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
    async (uri?: vscode.Uri) => {
      let yamlContent: string | undefined;
      let actualFilePath: string | undefined;

      if (uri) {
        // Handle Uri object from explorer context menu or string from other calls
        const fileUri = typeof uri === 'string' ? vscode.Uri.file(uri) : uri;
        const content = await vscode.workspace.fs.readFile(fileUri);
        yamlContent = Buffer.from(content).toString('utf8');
        actualFilePath = fileUri.fsPath;
      } else {
        // Get the first workspace folder as the default path
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        const options: vscode.OpenDialogOptions = {
          canSelectMany: false,
          openLabel: 'Select YAML/Cryml Schema',
          defaultUri: workspaceFolder?.uri,
          filters: {
            'Cryml Files': ['cryml'],
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
        // Create a unique label based on the file name and extension
        const fileName = actualFilePath ? actualFilePath.split('/').pop() || actualFilePath.split('\\').pop() : 'Schema';
        const isCryml = actualFilePath?.endsWith('.cryml');
        const label = `${isCryml ? 'Cryml' : 'YAML'}: ${fileName}`;

        FlowChartPanel.createOrShow(
          context.extensionUri,
          new ChartItemData('yaml', label, { schema: yamlContent, filePath: actualFilePath })
        );
      }
    }
  );

  // Register command to validate .cryml file
  const validateCrymlCommand = vscode.commands.registerCommand(
    'chart-vscode-ext.validateCryml',
    async () => {
      // Get active editor
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showWarningMessage('No active file to validate');
        return;
      }

      const content = activeEditor.document.getText();

      if (!content || content.trim().length === 0) {
        vscode.window.showWarningMessage('No content to validate');
        return;
      }

      // Simple validation - check for required fields
      try {
        const yaml = require('yaml');
        const parsed = yaml.parse(content);

        if (!parsed || typeof parsed !== 'object') {
          vscode.window.showErrorMessage('Invalid YAML: Empty or not an object');
          return;
        }

        const diagramType = parsed.diagram_type || 'erd';

        // Check for required metadata
        if (!parsed.metadata) {
          vscode.window.showErrorMessage('Missing required field: metadata');
          return;
        }

        if (!parsed.metadata.name) {
          vscode.window.showErrorMessage('Missing required field: metadata.name');
          return;
        }

        // Check for required fields based on diagram type
        if (diagramType === 'erd' && !parsed.models) {
          vscode.window.showErrorMessage('Missing required field for ERD: models');
          return;
        }

        if (diagramType === 'flow') {
          if (!parsed.nodes) {
            vscode.window.showErrorMessage('Missing required field for Flow: nodes');
            return;
          }
          // Validate node structure
          for (const [nodeId, node] of Object.entries(parsed.nodes)) {
            const flowNode = node as { type?: string; label?: string };
            if (!flowNode.type || !['start', 'end', 'process', 'decision', 'note'].includes(flowNode.type)) {
              vscode.window.showErrorMessage(`Invalid node type for "${nodeId}": ${flowNode.type}`);
              return;
            }
            if (!flowNode.label) {
              vscode.window.showErrorMessage(`Missing label for node: "${nodeId}"`);
              return;
            }
          }
        }

        vscode.window.showInformationMessage(`✓ Valid ${diagramType.toUpperCase()} diagram`);
      } catch (error) {
        vscode.window.showErrorMessage(`YAML parsing error: ${error}`);
      }
    }
  );

  context.subscriptions.push(openCommand, openPrismaCommand, saveYamlCommand, openYamlCommand, validateCrymlCommand);
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
        'Open Prisma Schema',
        vscode.TreeItemCollapsibleState.None,
        'open-prisma',
        {
          command: 'chart-vscode-ext.openPrisma',
          title: 'Open Prisma Schema',
        }
      ),
      new ChartItem(
        'Examples',
        vscode.TreeItemCollapsibleState.Collapsed,
        'examples',
        undefined,
        this._extensionUri
      ),
    ];
  }
}

class ChartItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    private readonly itemType: string,
    public readonly command?: vscode.Command,
    private readonly extensionUri?: vscode.Uri
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
      case 'examples':
        return new vscode.ThemeIcon('folder-opened');
      case 'folder':
        return new vscode.ThemeIcon('folder');
      case 'chart':
        return new vscode.ThemeIcon('graph');
      case 'prisma':
      case 'open-prisma':
        return new vscode.ThemeIcon('database');
      case 'yaml':
      case 'cryml':
        return new vscode.ThemeIcon('file-code');
      default:
        return new vscode.ThemeIcon('file');
    }
  }

  getChildren(): ChartItem[] {
    switch (this.itemType) {
      case 'examples':
        return this.getExamples();
      case 'folder':
        return this.getCharts();
      default:
        return [];
    }
  }

  private getExamples(): ChartItem[] {
    if (this.label === 'Examples' && this.extensionUri) {
      const examples = [
        { label: 'Order Processing Flow (Flow)', file: 'examples/flow-order-processing.cryml' },
        { label: 'Simple E-Commerce (ERD)', file: 'examples/simple-ecommerce.cryml' },
        { label: 'Quick Reference', file: 'examples/quick-reference.cryml' }
      ];

      const uri = this.extensionUri;
      return examples.map(ex =>
        new ChartItem(
          ex.label,
          vscode.TreeItemCollapsibleState.None,
          'cryml',
          {
            command: 'chart-vscode-ext.openYaml',
            title: 'Open Example',
            arguments: [`${uri.fsPath}/${ex.file}`]
          }
        )
      );
    }
    return [];
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
            // Show save dialog with workspace folder as default
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const defaultUri = workspaceFolder ? vscode.Uri.joinPath(workspaceFolder.uri, 'schema.cryml') : vscode.Uri.file('schema.cryml');

            const saveUri = await vscode.window.showSaveDialog({
              filters: {
                'Cryml Files': ['cryml'],
                'YAML Files': ['yml', 'yaml']
              },
              defaultUri,
              saveLabel: 'Save as Cryml'
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
