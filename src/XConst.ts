/**
 * Xpell Constants
 *
 * Canonical constants used across the Xpell runtime.
 *
 * This module defines well-known JSON node keys used by Xpell
 * object schemas, parsers, and serializers. Centralizing these
 * constants ensures consistency and prevents string duplication
 * across modules.
 *
 * One-liner: Constants define the Xpell object language.
 *
 * @packageDocumentation
 * @since 2022-07-22
 * @author Tamir Fridman
 * @license MIT
 * @copyright
 * © 2022–present Aime Technologies. All rights reserved.
 */


/**
 * XObject json nodes
 */
export const NODES = {
  type: "_type",
  children: "_children",
  parent_element: "_parent_element",
} as const

export type XNodeKey = typeof NODES[keyof typeof NODES]
