/**
 * The acture command registry — the app's single map of operations.
 *
 * Every user-facing operation in app_ef is registered here exactly once.
 * The command palette, keyboard shortcuts, and the surface forms are all
 * just *dispatch surfaces* over this one registry.
 */
import { createRegistry } from 'acture';
import type { AnyCommandRecord } from 'acture';
import {
  createCorpusCommand,
  deleteCorpusCommand,
  selectCorpusCommand,
} from './corpus';
import { exploreCommand, retrieveCommand, searchCommand } from './query';

/** All app commands, in palette display order within their categories. */
export const allCommands: readonly AnyCommandRecord[] = [
  createCorpusCommand,
  selectCorpusCommand,
  deleteCorpusCommand,
  searchCommand,
  exploreCommand,
  retrieveCommand,
];

/** The shared registry instance. */
export const registry = createRegistry();
registry.registerAll(allCommands);
