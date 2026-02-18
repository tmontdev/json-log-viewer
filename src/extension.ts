import * as vscode from 'vscode';
import { LogDebugAdapterTrackerFactory } from './debugAdapterWrapper';
import { LogViewerWebviewProvider } from './webviewPanel';

let webviewProvider: LogViewerWebviewProvider;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('JSON Log Viewer extension is now active');

  // Create webview provider
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
      webviewProvider.show();
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
