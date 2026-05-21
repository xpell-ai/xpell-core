/**
 * Xpell — Core Runtime Engine
 *
 * Entry point for the Xpell runtime.
 *
 * Xpell is a real-time application platform for JavaScript,
 * providing a unified runtime for UI, data, navigation,
 * and real-time communication across browsers and devices.
 *
 * ---
 *
 * ## Core Modules
 *
 * - **XUI** — User Interface engine (HTML / CSS / DOM)
 * - **XVM** — View Manager (navigation, regions, history)
 * - **XDB** — Data engine (entities, semantics, vectors)
 * - **Wormholes** — Real-time transport and sessions
 *
 * ---
 *
 * Xpell coordinates these modules into a single,
 * deterministic runtime environment.
 *
 * Xpell turns UI, data, and AI into a live runtime.
 * 
 * @packageDocumentation
 * @file xpell.ts
 * @since 2022-07-22
 * @author Tamir Fridman
 * @copyright © 2022–present Aime Technologies. All rights reserved.
 * @license MIT
 */




/** interface */
import XCommand, { XCommandData } from "./XCommand"
import { _xu, FPSCalc, XFrameScheduler } from "./XUtils"
import { XLogger as _xlog } from "./XLogger"
import { _xd } from "./XData"
import { XDataModule } from "./XDataModule"
import XParser from "./XParser"
import { XModule, XMODULE_SKILL } from "./XModule"
import { setXRuntime } from "./XRuntime";
import { XEventManagerModule } from "./XEvenetManagerModule"
import { XOBJECT_SKILL } from "./XObject"




export const XD_FRAME_NUMBER = "engine:frame-number";
export const XD_FPS = "engine:fps";





/**
 * @class  Xpell main engine
 */
export class XpellEngine {
    _version: string
    _engine_id: string
    _frame_number: number
    _log_rules = {
    }
    private _fps_calc: FPSCalc

    private _modules: { [name: string]: any } = {}
    private _schedule_frame: XFrameScheduler;
    parser: typeof XParser

    constructor(opts?: { _target_fps?: number; _schedule_frame?: XFrameScheduler }) {
        this._schedule_frame = opts?._schedule_frame ?? _xu.createDefaultScheduler(opts?._target_fps);
        this._version = "0.0.1"
        this._engine_id = _xu.guid()
        this._frame_number = 0
        this._fps_calc = new FPSCalc()
        this.parser = XParser
        this._modules = {}

        _xlog._enabled = false
        setXRuntime(this);

    }


    /**
     * @deprecated use _verbose instead
     * Enable Xpell logs to console
     */
    set verbose(val: boolean) {
        _xlog._enabled = val
    }

    /**
     * Enable Xpell logs to console
     */
    set _verbose(val: boolean) {
        _xlog._enabled = val
    }


    /**
     * Logs message to console using Xpell logger
     * make sure to enable verbose mode to see the logs
     * this method is a wrapper for XLogger.log
     * @param msg 
     * @param optionalParams
     */
    log(message?: any, ...optionalParams: any[]) {
        _xlog.log(message, ...optionalParams)
    }

    /**
     * Delay the execution of the next command
     * @param ms - delay in milliseconds
     * @returns 
     */
    async delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }



    /** 
     *  Module management
     *  Modules are the main building blocks of Xpell applications, providing specific functionality (UI, data, etc.)
     *  loadModule() is fire-and-forget.
     * Use loadModuleAsync() for deterministic startup. 
    */

    private addModule(xModule: XModule) {
        if (this._modules.hasOwnProperty(xModule._name)) {
            _xlog.log("Module " + xModule._name + " already loaded");
            return false;
        }
        this._modules[xModule._name] = xModule;
        return true;
    }

    /**
     * Loads Xpell module into the engine
     * @param {XModule} xModule 
     */
    loadModule(xModule: XModule): void {
        if (this.addModule(xModule)) {
            xModule.load()
        }
    }

    /**
     * Loads multiple module at ones
     * @param {Array<XModule>} xModulesArray 
     */
    loadModules(...xModulesArray: Array<XModule>): void {
        xModulesArray.forEach(mod => this.loadModule(mod))
    }

    async loadModuleAsync(xModule: XModule): Promise<void> {
        if (this.addModule(xModule)) {
            await xModule.load()
        }
    }

    async loadModulesAsync(...xModulesArray: Array<XModule>): Promise<void> {
        for (const mod of xModulesArray) {
            await this.loadModuleAsync(mod)
        }
    }




    /**
     * Display information about the Xpell engine to the console
     */
    info() {
        _xlog.log("Xpell information:\n- Engine Id: " + this._engine_id + "\n- Version " + this._version)
    }


    /**
    * Run textual xCommand -
    * @param {cmd} - text command
    */

    run(stringXCommand: string) {
        if (stringXCommand?.length > 2) {
            let scmd = XParser.parse(stringXCommand)
            return this.execute(scmd)
        } else {
            throw "Unable to parse Xpell command"
        }
    }

    /**
     * Execute Xpell Command 
     * @param {XCommand} 
     */
    execute(xcmd: XCommand | XCommandData): any {
        if (xcmd && xcmd._module && this._modules[xcmd._module]) {
            return this._modules[xcmd._module].execute(xcmd)
        } else {
            throw "Xpell module " + xcmd._module + " not loaded"
        }
    }



    /**
     * Main onFrame method
     * calls all the sub-modules onFrame methods (if implemented)
     */
    onFrame(): void {
        this._frame_number++;

        for (const mod of Object.keys(this._modules)) {
            const m = this._modules[mod];
            if (m?.onFrame && typeof m.onFrame === "function") {
                m.onFrame(this._frame_number);
            }
        }

        const fps = this._fps_calc.calc();

        // canonical keys (preferred)
        _xd.set(XD_FRAME_NUMBER, this._frame_number, { source: "engine" });
        _xd.set(XD_FPS, fps, { source: "engine" });

        // legacy keys (deprecated) - keep temporarily
        if (_xd._compat_legacy_keys) {
            _xd.set("frame-number", this._frame_number, { source: "engine:legacy" });
            _xd.set("fps", fps, { source: "engine:legacy" });
        }

        this._schedule_frame(() => this.onFrame());

    }



    /**
     * Gets Xpell module by name
     * @param {string} moduleName - name of the loaded module
     * @returns {XModule}
     */
    getModule(moduleName: string): XModule {
        return this._modules[moduleName]
    }

    /**
     * Start Xpell engine for web browsers using requestAnimationFrame
     */
    start() {
        _xlog.log("Loading Xpell core modules...[xd, xem]")
        this.loadModule(new XDataModule() as any)
        this.loadModule(new XEventManagerModule())
        _xlog.log("Starting Xpell")
        this.onFrame()
    }

    getCoreSkills() {
        return [
            XMODULE_SKILL,
            XOBJECT_SKILL
        ];
    }

    getModuleSkills() {
        return Object.values(this._modules)
            .flatMap((mod: any) =>
                typeof mod.getSkillChain === "function"
                    ? mod.getSkillChain()
                    : []
            );
    }

    getSkills() {
        return {
            _runtime: {
                _engine_id: this._engine_id,
                _version: this._version
            },

            _skills: this.getCoreSkills(),

            _modules: Object.values(this._modules).map((mod: any) => ({
                _name: mod._name,
                _skills:
                    typeof mod.getSkillChain === "function"
                        ? mod.getSkillChain()
                        : [],
                _objects:
                    typeof mod.getObjectSkills === "function"
                        ? mod.getObjectSkills()
                        : []
            }))
        };
    }

}

/**
 * Xpell Engine instance
 * @public Xpell Engine instance
 */
export const Xpell = new XpellEngine()

export default Xpell


export { Xpell as _x }
export { _XUtils, XUtils, _xu, type XFrameScheduler } from "./XUtils"
export { XData, _xd, type XDataStore, _XData } from "./XData"
export { XDataModule } from "./XDataModule"
export { XParser } from "./XParser"
export { XCommand, type XCommandData } from "./XCommand"
export { XLogger, XLogger as _xlog, _XLogger } from "./XLogger"
export {
    XModule,
    type XModuleData,
    // GenericModule
} from "./XModule"
export {
    XObject,
    XObjectPack,
    type XValue,
    type IXData,
    // type IXObjectData,
    type XDataXporter,
    type XDataXporterHandler,
    type XObjectData,
    type XObjectOnEventIndex,
    type XObjectOnEventHandler
} from "./XObject"
export { XObjectManager } from "./XObjectManager"
export {
    setXEventManager,
    getXEventManager,
    _XEventManager,
    type XEventListener,
    type XEventListenerOptions,
} from "./XEventManager.js";
export { XEventManagerModule } from "./XEvenetManagerModule"
export { type XNanoCommandPack, type XNanoCommand } from "./XNanoCommands"
export { createNanoCommandWithSkill } from "./XNanoCommands"
export { XParams } from "./XParams"
export { XError, type XErrorOptions, type XErrorLevel, type XErrorMeta } from "./XError"
export { type XResponseData, XResponse, XResponseOK, XResponseError } from "./XProtocol"
export type {
    XpellSkill,
    XpellSkillType,
    XpellSkillCommand,
    XpellSkillModule
} from "./XSkills";