'use strict';

/**
 * Returns the function that handles making the basename of
 * the output file.
 * 
 * The default filename maker takes three arguments namely:
 *  `fnamePrefix: string`,
 *  `thisSecLevel: number`,
 *  `sectionNumber: number`.
 *
 * @returns the function that generates the file basename.
 */
function getFilenameMaker () {
  return basenameMaker;
}

/**
 * Creates the basename for output html file based on
 * the section level and section number.  Eg. chap1, chap1_sec3-2.
 * @param {string} fnamePrefix
 * @param {number} thisSecLevel
 * @param {number} sectionNumber
 */
function basenameMaker (fnamePrefix, thisSecLevel, sectionNumber) {
  return thisSecLevel === 1 ? `${fnamePrefix}${sectionNumber}` :
    thisSecLevel === 2 ? `${fnamePrefix}_sec${sectionNumber}` : `${fnamePrefix}-${sectionNumber}`;
}

export default getFilenameMaker;
