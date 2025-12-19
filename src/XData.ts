/**
 * XData — Global Runtime Shared State
 *
 * Central in-memory data store for the Xpell runtime.
 *
 * `XData` provides a real-time, process-wide shared memory
 * accessible to all Xpell modules and components. It is used
 * to store and retrieve primitive values and structured objects
 * by identifier.
 *
 * ---
 *
 * ## Responsibilities
 *
 * - Provide shared access to primitive variables (`_v`)
 * - Provide shared access to structured objects (`_o`)
 * - Enable lightweight state sharing across modules
 * - Support real-time read/write access patterns
 *
 * ---
 *
 * ## Usage
 *
 * ### Store a primitive value
 * ```ts
 * XData._v["my-var-id"] = "my-var-value"
 * ```
 *
 * ### Read a primitive value
 * ```ts
 * const v = XData._v["my-var-id"]
 * ```
 *
 * ### Store an object
 * ```ts
 * XData._o["my-object-id"] = { my: "object" }
 * ```
 *
 * ### Read an object
 * ```ts
 * const o = XData._o["my-object-id"]
 * ```
 *
 * ---
 *
 * XData is a runtime convenience layer and not a persistence mechanism.
 *
 * One-liner: XData is the shared memory of the Xpell runtime.
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
    //deprecated use  _o instead
    objects: XDataObject = {}
    variables: XDataVariable = {}


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