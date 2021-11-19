/**
 * Copyright (c) Connexta
 *
 * <p>This is free software: you can redistribute it and/or modify it under the terms of the GNU
 * Lesser General Public License as published by the Free Software Foundation, either version 3 of
 * the License, or any later version.
 *
 * <p>This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details. A copy of the GNU Lesser General Public
 * License is distributed along with this program and can be found at
 * <http://www.gnu.org/licenses/lgpl.html>.
 */
import React from 'react'
import {
  MenuItem,
  CircularProgress,
  Typography,
  Checkbox,
  Select,
  FormControlLabel,
  FormGroup,
  Tooltip,
  DialogTitle,
  DialogContent,
  DialogActions,
  Dialog,
  TextField,
  Button,
} from '@material-ui/core'
import HelpIcon from '@material-ui/icons/Help'
import { allSites } from '../sites/gql/queries'
import { Query, Mutation } from 'react-apollo'
import Immutable from 'immutable'
import { allReplications } from './gql/queries'
import { addReplication } from './gql/mutations'
import { withStyles } from '@material-ui/core/styles'
import QuerySelector from './QuerySelector'
import SortPolicies from './SortPolicies'
import RJSON from 'relaxed-json'

const styles = {
  tooltip: {
    marginTop: 5,
  },
  replicationForm: {
    width: 360,
    height: 480,
  },
}

const WrappedTextField = props => {
  const {
    label,
    value,
    cursor,
    children,
    autoFocus = false,
    select = false,
    helperText = '',
    error = false,
  } = props

  return (
    <TextField
      autoFocus={autoFocus}
      select={select}
      margin='dense'
      onChange={cursor('id')}
      id='id'
      label={label}
      type='text'
      fullWidth
      value={value}
      helperText={helperText}
      error={error}
    >
      {children}
    </TextField>
  )
}

function alphabetical(a, b) {
  if (a.name.toLowerCase() < b.name.toLowerCase()) {
    return -1
  }
  if (a.name.toLowerCase() > b.name.toLowerCase()) {
    return 1
  }
  return 0
}

const defaultFormState = {
  open: false,
  name: '',
  direction: '',
  sourceId: '',
  destinationId: '',
  filter: '',
  sorts: [{ attribute: 'modified', direction: 'descending' }],
  biDirectional: false,
  priority: 5,
  filterErrorText: '',
  nameErrorText: '',
  disableSave: false,
}

class AddReplication extends React.Component {
  constructor(props) {
    super(props)

    this.state = defaultFormState
  }

  filterSites = (sites, siteFilterId) => {
    const filteredSites = sites.filter(site => site.id !== siteFilterId)
    return Immutable.List(filteredSites).sort(alphabetical)
  }

  sitesToMenuItems = (sites, siteFilterId) => {
    const filteredSites = sites.filter(site => site.id !== siteFilterId)
    const sorted = Immutable.List(filteredSites).sort(alphabetical)
    return sorted
      .map(site => (
        <MenuItem key={site.id} value={site.id}>
          {site.name}
        </MenuItem>
      ))
      .unshift(
        <MenuItem key='blank-reset' value=''>
          <Typography color='textSecondary'>None</Typography>
        </MenuItem>
      )
  }

  getFilterToSave = () => {
    const validSorts = this.state.sorts.filter(s => 
      s.attribute && s.attribute != '' && s.direction)
    return `${this.state.filter}::${JSON.stringify(validSorts)}`
  }

  handleChange = map => name => event => {
    this.setState({ [map[name]]: event.target.value })
  }

  handleAddSort = () => {
    const blankSort = { attribute: '', direction: 'ascending' }
    this.setState({ sorts: [...this.state.sorts, blankSort] })
  }

  handleRemoveSort = sort => {
    this.setState({ sorts: this.state.sorts.filter(s => s !== sort) })
  }

  handleChangeSort = (update, index) => {
    let newSorts = [...this.state.sorts]
    newSorts[index][update.id] = update.value
    this.setState({ sorts: newSorts })
  }

  handleSelectorChange = option => {
    if (option) {
      const parts = option.value.split('::')  
      this.setState({ filter: parts[0] || '' })
      if (parts.length > 1) {
        this.setState({ sorts: RJSON.parse(parts[1]) })
      }
    }
  }

  handlePriorityChange = name => event => {
    this.setState({ [name]: event.target.value })
  }

  handleCheck = name => event => {
    this.setState({ [name]: event.target.checked })
  }

  handleClickOpen = () => {
    this.setState({ open: true })
  }

  handleClose = () => {
    this.setState(defaultFormState)
  }

  handleInvalidFilter() {
    this.setState({
      filterErrorText: 'Invalid CQL Filter!',
    })
  }

  handleInvalidName() {
    this.setState({
      nameErrorText: 'Name already in use!',
    })
  }

  disableSaveButton() {
    this.setState({
      disableSave: true,
    })
  }

  enableSaveButton() {
    this.setState({
      disableSave: false,
    })
  }

  render() {
    const { Button: AddButton, classes } = this.props
    const {
      open,
      name,
      sourceId,
      destinationId,
      filter,
      sorts,
      biDirectional,
      priority,
      filterErrorText,
      nameErrorText,
      disableSave = false,
    } = this.state

    return (
      <div>
        <AddButton onClick={this.handleClickOpen} />
        <Dialog
          open={open}
          onClose={this.handleClose}
          aria-labelledby='form-dialog-title'
          fullWidth={true}
        >
          <DialogTitle id='form-dialog-title'>
            New Replication Setup
          </DialogTitle>
          <DialogContent>
            <WrappedTextField
              label='Replication Name *'
              value={name}
              cursor={this.handleChange({
                id: 'name',
              })}
              helperText={nameErrorText ? nameErrorText : ''}
              error={nameErrorText ? true : false}
            />
            <Query query={allSites}>
              {({ loading, error, data }) => {
                if (loading) return <Typography>Loading...</Typography>
                if (error) return <Typography>Error...</Typography>

                return (
                  <div>
                    <WrappedTextField
                      label='Source Node *'
                      value={sourceId}
                      cursor={this.handleChange({
                        id: 'sourceId',
                      })}
                      select={true}
                    >
                      {this.sitesToMenuItems(
                        data.replication.sites,
                        destinationId
                      )}
                    </WrappedTextField>

                    <WrappedTextField
                      label='Destination Node *'
                      value={destinationId}
                      cursor={this.handleChange({
                        id: 'destinationId',
                      })}
                      select={true}
                    >
                      {this.sitesToMenuItems(data.replication.sites, sourceId)}
                    </WrappedTextField>

                    <FormGroup>
                      <div style={{ display: 'flex' }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={this.state.biDirectional}
                              onChange={this.handleCheck('biDirectional')}
                              value='biDirectional'
                            />
                          }
                          label='Bidirectional'
                        />
                        <Tooltip
                          className={classes.tooltip}
                          title='If checked, resources will be synchronized between the selected Source and Destination nodes based on the filter.'
                          placement='right'
                        >
                          <HelpIcon fontSize='small' />
                        </Tooltip>
                      </div>
                    </FormGroup>
                    <FormGroup>
                      <div style={{ display: 'flex' }}>
                        <FormControlLabel
                          style={{ padding: '0px 0px 16px 16px' }}
                          label='Priority'
                          control={
                            <Select
                              style={{ 'paddingRight': '12px' }}
                              value={priority}
                              onChange={this.handlePriorityChange('priority')}
                            >
                              <MenuItem value={10}>10 - High</MenuItem>
                              <MenuItem value={9}>9 - High</MenuItem>
                              <MenuItem value={8}>8 - High</MenuItem>
                              <MenuItem value={7}>7 - Medium</MenuItem>
                              <MenuItem value={6}>6 - Medium</MenuItem>
                              <MenuItem value={5}>5 - Medium</MenuItem>
                              <MenuItem value={4}>4 - Medium</MenuItem>
                              <MenuItem value={3}>3 - Low</MenuItem>
                              <MenuItem value={2}>2 - Low</MenuItem>
                              <MenuItem value={1}>1 - Low</MenuItem>
                            </Select>
                          }
                        />
                      </div>
                    </FormGroup>
                  </div>
                )
              }}
            </Query>
            <QuerySelector onChange={this.handleSelectorChange} />

            <WrappedTextField
              label='Filter *'
              value={filter}
              cursor={this.handleChange({
                id: 'filter',
              })}
              helperText={
                filterErrorText
                  ? filterErrorText
                  : 'A CQL filter specifying resources to replicate.'
              }
              error={filterErrorText ? true : false}
            />
            <SortPolicies 
              sortPolicies={sorts} 
              onAddSort={this.handleAddSort} 
              onRemoveSort={this.handleRemoveSort} 
              onChangeSort={this.handleChangeSort}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleClose} color='primary'>
              Cancel
            </Button>
            <Mutation
              mutation={addReplication}
              onError={error => {
                error.graphQLErrors &&
                  error.graphQLErrors.forEach(e => {
                    if (e.message === 'INVALID_FILTER') {
                      this.handleInvalidFilter()
                    } else if (e.message === 'DUPLICATE_CONFIGURATION') {
                      this.handleInvalidName()
                    }
                    this.enableSaveButton()
                  })
              }}
              onCompleted={() => {
                this.setState(defaultFormState)
              }}
            >
              {(createReplication, { loading }) => (
                <div>
                  <Button
                    disabled={
                      !(name && sourceId && destinationId && filter) ||
                      disableSave
                    }
                    color='primary'
                    onClick={() => {
                      this.disableSaveButton()
                      createReplication({
                        variables: {
                          name: name,
                          sourceId: sourceId,
                          destinationId: destinationId,
                          filter: this.getFilterToSave(),
                          biDirectional: biDirectional,
                          priority: priority,
                        },
                        update: (store, { data: { createReplication } }) => {
                          const data = store.readQuery({
                            query: allReplications,
                          })
                          data.replication.replications.push(createReplication)
                          store.writeQuery({
                            query: allReplications,
                            data,
                          })
                        },
                      })
                    }}
                  >
                    Save {loading && <CircularProgress size={10} />}
                  </Button>
                </div>
              )}
            </Mutation>
          </DialogActions>
        </Dialog>
      </div>
    )
  }
}

export default withStyles(styles)(AddReplication)
