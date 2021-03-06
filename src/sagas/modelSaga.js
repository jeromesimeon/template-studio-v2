import { takeLatest, put, select } from 'redux-saga/effects';
import { APModelManager } from '@accordproject/ergo-compiler';
import * as clauseTemplateSelectors from '../selectors/clauseTemplateSelectors';
import * as actions from '../actions/modelActions';
import * as clauseTemplateActions from '../actions/clauseTemplatesActions';
import {
  EDIT_CLAUSE_MODEL,
  VALIDATE_CLAUSE_MODEL_FILES
} from '../actions/constants';

/**
 * saga which yields to putting the successful model manager into the store
 * and subsequently clears all model manager errors from the store
 */
export function* validateClauseModelFiles(action) {
  const { clauseTemplateId } = action;

  // get all the model files for a template
  const clauseTemplates = yield select(clauseTemplateSelectors.clauseTemplates);
  const modelFiles = clauseTemplates[clauseTemplateId].model;

  try {
    // create a new ModelManager with the template's concerto files
    const modelManager = new APModelManager();
    modelFiles.forEach((file) => {
      modelManager.addModelFile(file.content, file.name, true);
    });

    // download external dependencies
    yield modelManager.updateExternalModels();

    // validate the model manager
    modelManager.validateModelFiles();

    yield put(actions.updateModelManagerSuccess(modelManager));

    yield put(actions.updateModelManagerError(null, clauseTemplateId));
  } catch (err) {
    err.type = 'Model';
    err.fileName = action.fileName;
    yield put(actions.updateModelManagerError(err, clauseTemplateId));
  }
}

/**
 * saga which yields to updating the model file and
 * subsequently puts a valid model in the store
 */
export function* updateModelFileOnStore(modelFileAction) {
  const { clauseTemplateId, fileName, content } = modelFileAction;
  yield put(clauseTemplateActions.editClauseModelSuccess(clauseTemplateId, fileName, content));

  yield put(actions.validateClauseModelFilesAction(clauseTemplateId, fileName));
}

export const modelSaga = [
  takeLatest(EDIT_CLAUSE_MODEL, updateModelFileOnStore),
  takeLatest(VALIDATE_CLAUSE_MODEL_FILES, validateClauseModelFiles),
];
