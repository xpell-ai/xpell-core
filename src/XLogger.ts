/**
 * XLogger — Xpell Logging Engine
 *
 * Central logging facility for the Xpell runtime.
 *
 * Provides a lightweight, unified logging API (`_xlog`) used across
 * all Xpell modules for diagnostics, debugging, and runtime visibility.
 *
 * ---
 *
 * ## Responsibilities
 *
 * - Structured logging for core runtime events
 * - Debug and error reporting across modules
 * - Optional verbosity and filtering controls
 *
 * ---
 *
 * XLogger is infrastructure-only and has no dependency on
 * UI, navigation, or data layers.
 *
 * One-liner: XLogger is the voice of the Xpell runtime.
 *
 * @packageDocumentation
 * @since 2022-07-22
 * @author Tamir Fridman
 * @license MIT
 * @copyright
 * © 2022–present Aime Technologies. All rights reserved.
 */



/**
 * @class XLoggerEngine Xpell Logger engine
 */
export class _XLogger  {
    /**
     * Enable logger activity if false no logs will be displayed
     */
    _enabled: boolean = true
    /**
     * Show the date in every log message
     */
    _show_date:boolean = false
    /**
     * Show the Time in every log message
     */
    _show_time:boolean = true
    _debug: boolean = false //debug mode for the logger

    constructor() {
    }

    /**
     * Generates the log output date/time signature (affected by showDate & showTime properties)
     * @returns {string}
     */
    private getLogDateTimeSignature():string {
        const d = new Date()

        const getDate = () => {return (this._show_date) ? d.getDate() + '.' + d.getMonth() + '.' + d.getFullYear() + " ": "" }
        const getTime = () => {return (this._show_time) ?d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + "." + d.getMilliseconds() +"|": "" }
        return  getDate() + getTime()
    }

    /**
     * Log a message to the output log (console)
     * @param message - message to present
     * @param optionalParams 
     */
    log(message?: any, ...optionalParams: any[]) {
        if (this._enabled) {
            var args = Array.prototype.slice.call(arguments);
            args.unshift(this.getLogDateTimeSignature());
            console.log.apply(console, args);
        }
    }

    /**
     * Log an error message to the output log (console)
     * @param message - message to present
     * @param optionalParams 
     */
    error(message?: any, ...optionalParams: any[]) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(this.getLogDateTimeSignature());
        console.error.apply(console, args);
    }

    debug(message?: any, ...optionalParams: any[]) {
        if (this._debug) {
            var args = Array.prototype.slice.call(arguments);
            args.unshift(this.getLogDateTimeSignature());
            console.debug.apply(console, args);
        }
    }




}

/**
 * 
 */
export const XLogger = new _XLogger()
export default XLogger
export {XLogger as _xlog}