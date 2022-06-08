/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
import { jsonFormula } from '../json-formula';
import createForm from '../Form';
import functions from '../jmespath/openFormulaFunctions';
import stringToNumber from '../jmespath/stringToNumber';

const sampleData = require('./sampleData.json');
// This test file is useful to test one case in isolation.
const tests = require('./testOne.json');

test.each(tests)('%s', (_desc, tst) => {
  if (tst.fieldsOnly) return;
  const language = tst.language || 'en-US';
  const data = jsonFormula(sampleData, {}, tst.data, functions, stringToNumber);
  let result;
  try {
    result = jsonFormula(data, {}, tst.expression, functions, stringToNumber, [], language);
  } catch (e) {
    expect(tst.error).toBe('syntax');
    return;
  }
  if (typeof result === 'number') {
    expect(result).toBeCloseTo(tst.expected, 5);
  } else {
    expect(result).toEqual(tst.expected);
  }
});

// run again -- with field definitions
test.each(tests)('%s', (_desc, tst) => {
  const language = tst.language || 'en-US';
  const data = jsonFormula(sampleData, {}, tst.data, functions, stringToNumber);
  let jsonResult;
  try {
    const root = createForm(data);
    jsonResult = jsonFormula(
      root,
      { $form: root, $: {} },
      tst.expression,
      functions,
      stringToNumber,
      [],
      language,
    );
  } catch (e) {
    expect(tst.error).toBe('syntax');
    return;
  }
  // stringify/parse so that the comparison doesn't get confused by field objects
  const result = JSON.parse(JSON.stringify(jsonResult));
  if (typeof result === 'number') {
    expect(result).toBeCloseTo(tst.expected, 5);
  } else {
    expect(result).toEqual(tst.expected);
  }
});
