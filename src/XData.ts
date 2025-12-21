/**
 * XData — Global Runtime Shared State
 *
 * Central in-memory shared state for the Xpell runtime.
 *
 * `XData` provides process-wide shared memory accessible to all
 * Xpell modules and runtime components. It is designed for
 * explicit, lightweight state sharing during execution.
 *
 * XData is NOT a persistence mechanism.
 *
 * ---
 *
 * ## Responsibilities
 *
 * - Provide shared access to structured runtime objects (`_o`)
 * - Enable explicit state sharing across modules
 * - Act as a single source of truth for shared runtime values
 *
 * ---
 *
 * ## Access
 *
 * XData can be accessed either directly or via the engine alias:
 *
 * - `XData._o[...]`
 * - `_xd._o[...]` (engine-provided alias)
 *
 * ---
 *
 * ## Usage
 *
 * ### Store an object
 * ```ts
 * XData._o["object-name"] = { /* data *\/ };
 * _xd._o["object-name"] = { /* data *\/ };
 * ```
 *
 * ### Read an object
 * ```ts
 * const obj = XData._o["object-name"];
 * const obj = _xd._o["object-name"];
 * ```
 *
 * ---
 *
 * ## Rules
 *
 * - XData is process-wide and shared across all modules
 * - Mutations must be explicit and traceable
 * - Keys must be stable, named, and documented at their point of use
 * - Do not mirror XData into hidden local mutable state
 * - Do not assume persistence or durability
 *
 * ---
 *
 * One-liner:
 * XData is the shared runtime memory of the Xpell engine.
 *
 * @packageDocumentation
 * @since 2022-07-22
 * @author Tamir Fridman
 * @license MIT
 * @copyright
 * © 2022–present Aime Technologies. All rights reserved.
 */


export type XDataObject = {[_id: string ]: any}
export type XDataVariable = {[_id: string ]: string | number | boolean}


export class _XData {
    

    #_objects: XDataObject = {}

    constructor(){
        this.#_objects = {}
    }


    

    /**
     * This method gets the XData object
     * @returns XDataObject object
     * @example
     *  // get the XDataObject object
     *  const o = XData._o["my-object-id"]
     *  // set the XDataObject object
     *  XData._o["my-object-id"] = {my:"object"}
     */
    get _o(){
        return this.#_objects
    }


    /**
     * This method adds an object to the XData object
     * @param objectId 
     * @param object
     * @remark It is also possible to use the XData._o property -> XData._o["my-object-id"] = {my:"object"} 
     * */
    set(objectId:string, object:any) {
        this.#_objects[objectId] = object
    }

    /**
     * This method checks if the XData object has an object by id
     * @param objectId
     * @returns boolean
     * @remark It is also possible to query the XData._o property -> if(XData._o["my-object-id"])...
     * */
    has(objectId:string):boolean {
        return this.#_objects.hasOwnProperty(objectId)
    }

    /**
     * Deletes an object from the XData object
     * @param objectId 
     */
    delete(objectId:string) {
        delete this.#_objects[objectId]
    }

    /**
     * Gets an object and delete it from the XData object list
     * @param objectId 
     * @returns 
     */
    pick(objectId:string) {
        const obj = this.#_objects[objectId]
        this.delete(objectId)
        return obj
    }


    /**
     * This method cleans the XData Memory
     */
    clean(){
        this.#_objects = {}
    }


}

/**
 * @property 
 */
export const XData = new _XData()

export default XData