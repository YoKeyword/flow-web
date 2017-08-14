import React, { Component } from 'react'
import PropTypes from 'prop-types'

import createI18n from './i18n'
import language from 'util/language'

import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import autoCancel from 'react-redux-http'
import { STATUS } from 'redux-http'

import { actions } from 'redux/modules/job'

import Loading from 'components/Loading'

// import JobNavbar from './components/JobNavbar'
import JobStatusHeader from './components/JobStatusHeader'

import classes from './job.scss'

// const NAVBARS = [{
//   text: '详细信息',
//   href: ''
// }]

function mapStateToProps (state, props) {
  const { job } = state
  const { params: { jobId } } = props
  const status = job.getIn(['ui', jobId, 'GET'])
  return {
    key: jobId,
    id: jobId,
    isNotFound: false,
    loaded: status === STATUS.success,
  }
}

function mapDispatchToProps (dispatch) {
  return bindActionCreators({
    get: actions.get
  }, dispatch)
}

export class JobContainer extends Component {
  static propTypes = {
    id: PropTypes.string.isRequired,
    isNotFound: PropTypes.bool,
    loaded: PropTypes.bool,

    children: PropTypes.node,

    get: PropTypes.func.isRequired,
    i18n: PropTypes.func.isRequired
  }

  static defaultProps = {
    i18n: createI18n(language),
  }

  state = {
  }

  componentDidMount () {
    const { get, id } = this.props
    get(id)
  }

  renderLoading () {
    return <div className={classes.loading}>
      <Loading />
    </div>
  }

  renderContent () {
    // const { children } = this.props
    return <div>
      Hello world
    </div>
  }

  render () {
    const { loaded, id, i18n } = this.props
    return <div className={classes.container}>
      {loaded && <JobStatusHeader id={id} i18n={i18n} />}
      {loaded ? this.renderContent() : this.renderLoading()}
    </div>
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(
  autoCancel({ funcs: ['get'] })(JobContainer)
)