const originalWrite = process.stdout.write.bind(process.stdout);
let isIntercepting = false;

function isJsonLog(str: string): boolean {
  const trimmed = str.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}

(process.stdout as any).write = function (
  chunk: string | Uint8Array,
  encodingOrCb?: BufferEncoding | Function,
  cb?: Function
): boolean {
  
  if (!process.env.VSCODE_INSPECTOR_OPTIONS) {
    return originalWrite.apply(process.stdout, arguments as any);
  }
  
  if (!isIntercepting && typeof chunk === 'string' && isJsonLog(chunk)) {
    const stack = new Error().stack || '';
    const isConsole = stack.includes('at Console.');
    
    if (!stack.includes('at Console.')) {
      isIntercepting = true;
      console.info(chunk.trim());
      isIntercepting = false;
    }
  }

  return originalWrite.apply(process.stdout, arguments as any);
};