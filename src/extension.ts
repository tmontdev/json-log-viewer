import * as vscode from 'vscode';
import { LogDebugAdapterTrackerFactory } from './debugAdapterWrapper';
import { LogViewerWebviewProvider } from './webviewPanel';
import * as path from 'path';

let webviewProvider: LogViewerWebviewProvider;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('JSON Log Viewer extension is now active');
  const interceptorPath = path.join(context.extensionPath, 'dist', 'stdout-interceptor.js');
  context.environmentVariableCollection.append('NODE_OPTIONS', ` --require "${interceptorPath}"`);
  const configProvider = vscode.debug.registerDebugConfigurationProvider('*', {
  resolveDebugConfiguration(folder, config, token) {
    
    // Regra: Se for um attach puro de "pwa-node" (ex: anexando a um container docker rodando), 
    // nós não podemos injetar variáveis, então retornamos.
    if (config.type === 'pwa-node' && config.request === 'attach') {
      return config;
    }

    // Se passou, significa que é um "launch" OU um "node-terminal" (que usa attach).
    // Em ambos os casos, o VS Code vai instanciar o ambiente, então PODEMOS injetar!

    const interceptorPath = path.join(context.extensionPath, 'dist', 'stdout-interceptor.js');
    
    config.env = config.env || {};
    const launchEnvOptions = config.env.NODE_OPTIONS || '';
    const systemEnvOptions = process.env.NODE_OPTIONS || '';
    const userExistingNodeOptions = launchEnvOptions || systemEnvOptions;

    if (!userExistingNodeOptions.includes('stdout-interceptor.js')) {
      // Adicionamos o nosso interceptador silenciosamente
      config.env.NODE_OPTIONS = `${userExistingNodeOptions} --require "${interceptorPath}"`.trim();
    }

    return config;
  }
});
  webviewProvider = new LogViewerWebviewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LogViewerWebviewProvider.viewType,
      webviewProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true // Keep webview alive when tab is hidden
        }
      }
    )
  );

  // Register Debug Adapter Tracker Factory for all debug types
  const trackerFactory = new LogDebugAdapterTrackerFactory(webviewProvider);
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterTrackerFactory('*', trackerFactory)
  );

  // Track debug session lifecycle
  context.subscriptions.push(
    vscode.debug.onDidStartDebugSession((session) => {
      webviewProvider.addSession(session);
      // webviewProvider.show();
    })
  );

  context.subscriptions.push(
    vscode.debug.onDidTerminateDebugSession((session) => {
      webviewProvider.endSession(session.id);
    })
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('json-log-viewer.clearLogs', () => {
      webviewProvider.clearLogs();
      vscode.window.showInformationMessage('JSON Log Viewer: Logs cleared');
    })
  );

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('jsonLogViewer')) {
        webviewProvider.updateConfig();
      }
    })
  );
}

/**
 * Extension deactivation
 */
export function deactivate() {
  // Cleanup handled by subscriptions
}
