interface Window {
  geodataWorker: Worker;
  geodataWorkerPromises: {
    [url: string]: {
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
    }
  };
} 