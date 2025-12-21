/**
 * Xpell Parser
 *
 * Input parsing layer for the Xpell runtime.
 *
 * Responsible for converting external representations
 * (XML, HTML, raw text, and JSON) into normalized
 * Xpell commands and runtime instructions.
 *
 * ---
 *
 * ## Responsibilities
 *
 * - Parse XML, HTML, raw text, and JSON inputs
 * - Normalize input into Xpell command structures
 * - Validate and sanitize external input formats
 * - Provide a unified entry point for declarative and textual inputs
 *
 * ---
 *
 * ## Architectural Role
 *
 * The parser is format-aware but runtime-agnostic.
 * It does not execute commands or mutate state directly.
 *
 * Parsed output is consumed by:
 * - XUI (UI creation)
 * - XVM (navigation and flow)
 * - XDB (data and entities)
 *
 * ---
 *
 * The parser defines the boundary between
 * untrusted input and the Xpell runtime.
 *
 * @packageDocumentation
 * @since 2022-07-22
 * @author Tamir Fridman
 * @license MIT
 * @copyright © 2022–present Aime Technologies. All rights reserved.
 */

import XCommand, { XCommandData } from "./XCommand"
import * as _XC from "./XConst"


export class XParser {


    private static html2XMap = {
        elements: {
            div: "view",
            a: "link",
            b: "xhtml",
            h1: "xhtml", h2: "xhtml", h3: "xhtml", h4: "xhtml", h5: "xhtml", p: "xhtml", small: "xhtml", aside: "xhtml", span: "xhtml",
            table: "xhtml", th: "xhtml", td: "xhtml", tr: "xhtml", thead: "xhtml", tbody: "xhtml",
            ul: "xhtml", li: "xhtml", ol: "xhtml",
            canvas: "xhtml",
            img: "image",
        },
        attributes: {
            id: "_id"
        }
    }


    /**
     * Adds HTML-Xpell Mapping item
     * @param htmlElement HTML element to change from
     * @param xpellElement Xpell element to change to 
     */
    static addHtml2XpellMapItem(htmlElement: string, xpellElement: string) {
        XParser.html2XMap.elements[<"div">htmlElement] = xpellElement
    }


    /**
     * convert text command to Xpell json command
     * @param {string} txt 
     */
    static parse(txt: string, module?: string): XCommand {

        const carr: string[] = txt.split(" ")
        let rv = new XCommand()
        if (module) {

            rv["_module"] = module
            rv["_op"] = carr[0]
        } else {
            rv["_module"] = carr[0]
            rv["_op"] = carr[1]
        }
        rv["_params"] = {}

        if (carr.length > 1) {
            for (let i = 2; i < carr.length; ++i) {
                const v = carr[i]
                const dl = v.indexOf(":")
                if (dl > -1) {
                    const mc = v.split(":")
                    rv._params[mc[0]] = mc[1]
                }
                else {
                    rv._params[i - 1] = carr[i]
                }

            }
        }

        return rv
    }


    static replaceSpacesInQuotes(inputString: string, replaceWith: string = "_%20_") {
        return inputString.replace(/(['"])(.*?)\1/g, (_match, quote, content) => {
            const fixed = String(content).replace(/\s/g, replaceWith);
            return `${quote}${fixed}${quote}`; // keep the quotes!
        });
    }





    static parseObjectCommand(command: string, module?: string) {
        command = XParser.replaceSpacesInQuotes(command);
        const parts = command.trim().split(/\s+/);

        const moduleName = module ? module : (parts.shift() as string);
        if (!moduleName) throw new Error("Missing module name");

        // Optional explicit object target: "#<id>"
        let objectId: string | undefined;
        if (parts[0]?.startsWith("#")) {
            objectId = parts.shift()!.slice(1);
            if (!objectId) throw new Error("Invalid object selector '#'. Use '#<id>'");
        }

        const op = parts.shift();
        if (!op) throw new Error("Missing operation");

        // --- params (same behavior as your current parser) ---
        const params: any = {};
        let currentParam: string | null = null;
        let valueInProgress: string | null = null;

        parts.forEach(part => {
            if (valueInProgress) {
                valueInProgress += ` ${part}`;
                if (part.endsWith(valueInProgress[0])) {
                    const value = valueInProgress.slice(1, -1).replace(/_%20_/g, " ");
                    params[currentParam!] = value;
                    valueInProgress = null;
                }
                return;
            }

            if (part.startsWith('"') || part.startsWith("'")) {
                valueInProgress = part;
                if (part.endsWith(part[0]) && part.length > 1) {
                    const value = part.slice(1, -1).replace(/_%20_/g, " ");
                    params[currentParam!] = value;
                    valueInProgress = null;
                }
                return;
            }

            if (part.includes(":")) {
                const segs = part.split(":");
                const k = segs[0];
                const v = segs.slice(1).join(":").replace(/_%20_/g, " ");
                params[k] = v;
                currentParam = null;
                return;
            }

            // bare token -> parameter name (expects next token to be a value)
            currentParam = part.replace(/_%20_/g, " ");
        });

        if (valueInProgress) throw new Error("Unclosed quoted parameter value");

        return {
            _module: moduleName,
            _object: objectId,
            _op: op,
            _params: params
        };
    }





  

    /**
     * Converts XML/HTML string to XCommand
     * @param xmlString XML string
     * @returns 
     */
    static xmlString2Xpell(xmlString: string): {} {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        if (xmlDoc.childNodes.length > 0) {
            return XParser.xml2Xpell(xmlDoc.childNodes[0])
        } else return {}

    }

    /**
     * Converts XML/HTML Document to Xpell JSON
     * @param xmlNode XML Document Node
     * @param forceXhtml force Xpell XHTML for every unknown object
     * @returns {} Xpell JSON
     */
    static xml2Xpell(xmlNode: any, forceXhtml?: boolean): {} {
        //Conversation map for elements and attributes
        const cMap = XParser.html2XMap
        let scanChildren = true
        let outputXpell: { [k: string]: any } = {}
        outputXpell["_children"] = []
        const root_name = xmlNode.nodeName
        const _html_tag_attr = xmlNode.nodeName
        let forceXhtmlOnChildren = forceXhtml
        if (forceXhtml) {
            outputXpell[_XC.NODES.type] = "xhtml"
            outputXpell["_html_ns"] = 'http://www.w3.org/2000/svg'
        } else {
            outputXpell["_type"] = (cMap.elements[<"div">root_name]) ? cMap.elements[<"div">root_name] : root_name  //html element to xpell object name
        }
        if (xmlNode.attributes) {
            for (let i = 0; i < xmlNode.attributes.length; ++i) {
                const n = xmlNode.attributes[i]
                const attr_name = (cMap.attributes[<"id">n.name]) ? cMap.attributes[<"id">n.name] : n.name //replace html attribute to xpell attributes (id -> _id)
                outputXpell[attr_name] = n.value
            }
        }
        if (xmlNode?.firstChild?.nodeValue) {
            outputXpell["text"] = xmlNode?.firstChild.nodeValue.trim();
        }
        if (outputXpell[_XC.NODES.type] == "xhtml") {
            outputXpell["_html_tag"] = _html_tag_attr
        }
        else if (outputXpell[_XC.NODES.type] == "svg") {
            forceXhtmlOnChildren = true
            outputXpell["_html_ns"] = 'http://www.w3.org/2000/svg'
        }
        if (scanChildren && xmlNode?.childNodes.length > 0) {
            for (let i = 0; i < xmlNode.childNodes.length; ++i) {
                const node = (xmlNode.childNodes[i])
                if (!node.nodeName.startsWith("#")) {
                    outputXpell[_XC.NODES.children].push(XParser.xml2Xpell(node, forceXhtmlOnChildren))
                }
            }
        }
        return outputXpell

    }


   
}

export default XParser
