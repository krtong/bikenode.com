declare module 'browser' {
  export class Browser {
    constructor();
    
    /**
     * Navigate to a URL
     */
    goto(url: string): Promise<void>;
    
    /**
     * Close the browser
     */
    close(): Promise<void>;
    
    /**
     * Perform an action on the page
     */
    do(instruction: string): Promise<any>;
    
    /**
     * Extract data from the page
     */
    extract<T>(schema: any): Promise<T>;
  }
}