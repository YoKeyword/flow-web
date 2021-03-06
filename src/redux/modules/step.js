import { handleActions } from 'redux-actions'
import { handleHttp } from '../util'
import { defaultInitState, handlers } from 'redux/handler'
import types from './stepType'

import is from 'util/is'
import { Map, fromJS } from 'immutable'

const initState = defaultInitState

function transformResponse (data) {
  if (is.array(data)) {
    data.forEach((d) => { d.id = d.name })
  } else if (is.object(data) && data.name) {
    data.id = data.name
  }
  return data
}

function getStepsWrapper (fn) {
  return function (...args) {
    return function (dispatch, getState) {
      const { step } = getState()
      return dispatch(fn(step, ...args))
    }
  }
}

function updateStep (steps, flowId, step) {
  const nextSteps = steps.updateIn(['data', step.get('id')], () => step)
  const data = nextSteps.get('data')
  const list = nextSteps.get('list').map((id) => data.get(id)).toJS()
  // remove id prop
  list.forEach((d) => { d.id = undefined })
  return actions.update(flowId, list)
}

function removeStep (steps, flowId, stepId) {
  const names = steps.get('list').filter((id) => id !== stepId)
  const data = steps.get('data')
  const list = names.map((name) => data.get(name)).toJS()
  return actions.update(flowId, list)
}

function createIncreasingName (name, index, check) {
  index = index || 0
  // 自动补名从 2 开始
  const nextName = index ? `${name}${index + 1}` : name
  if (check(nextName)) {
    return nextName
  }
  return createIncreasingName(name, index + 1, check)
}

function checkRepeat (list, name) {
  return !list.includes(name)
}

function addStep (steps, flowId, step) {
  const list = steps.get('list')
  const data = steps.get('data')

  const stepName = step.get('name')

  const checkName = (name) => {
    return checkRepeat(list, name)
  }

  const saveName = createIncreasingName(stepName, 0, checkName)
  const envs = step.get('envs')
  const saveStep = {
    name: saveName,
    plugin: step.get('plugin'),
    allowFailure: step.get('allowFailure'),
    envs: envs ? envs.toJS() : undefined,
    script: step.get('script'),
    isFinal: step.get('isFinal'),
  }

  const saveSteps = list.map((id) => data.get(id)).toJS()
  const saveIndex = saveStep.isFinal ? saveSteps.length
    : saveSteps.findIndex((step) => step.isFinal)
  // 将isFinal step 插至最后，将 非 isFinal step 插在第一个 isFinal step 前
  saveSteps.splice(saveIndex, 0, saveStep)

  return actions.update(flowId, saveSteps)
}

function addAbstractStep (steps, flowId, _step) {
  const list = steps.get('list')
  const step = Map.isMap(_step) ? _step : fromJS(_step)
  const stepName = step.get('name')

  const checkName = (name) => {
    return checkRepeat(list, name)
  }
  const saveName = createIncreasingName(stepName, 0, checkName)
  return {
    type: types.saveAbstractStep,
    payload: step.set('name', saveName)
  }
}

export const actions = {
  query (flowId) {
    return {
      url: '/flows/:flowName/steps',
      name: types.query,
      params: {
        flowName: flowId,
      },
      transformResponse,
    }
  },
  update (flowId, steps) {
    return {
      url: `/flows/${flowId}/steps`,
      method: 'post',
      data: steps,
      name: types.update,
      transformResponse,
    }
  },
  updateStep: getStepsWrapper(updateStep),
  removeStep: getStepsWrapper(removeStep),
  addStep: getStepsWrapper(addStep),
  setAbstractStep: getStepsWrapper(addAbstractStep),
  freedAbstractStep () {
    return {
      type: types.freedAbstractStep,
    }
  },
  freed () {
    return {
      type: types.freed,
    }
  }
}

export default handleActions({
  [types.query]: handleHttp('QUERY', {
    success: handlers.saveAll
  }),
  [types.update]: handleHttp('QUERY', {
    success: function (state, action) {
      const ns = initState.set('ui', state.get('ui'))
      return handlers.saveAll(ns, action)
    }
  }),
  [types.saveAbstractStep]: function (state, { payload }) {
    const step = Map.isMap(payload) ? payload : fromJS(payload)

    return state.update('ui', (ui) => {
      return ui.set('abstractStep', step)
    })
  },
  [types.freedAbstractStep]: function (state) {
    return state.update('ui', (ui) => {
      return ui.remove('abstractStep')
    })
  },
  [types.freed]: function () {
    return initState
  }
}, initState)
