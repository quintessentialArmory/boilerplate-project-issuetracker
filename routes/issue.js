'use strict';

const ObjectID = require('mongodb').ObjectID;

function Insert (doc, project_name) {
    doc.project_name = project_name;
    this.doc = doc;
}

const required = [ // in a POST request
    'issue_title',
    'issue_text',
    'created_by',
];
Insert.prototype.lacksRequired = function () {
    for (let field of required) {
        if (typeof this.doc[field] === 'undefined') {
            return true;
        }
    }
    return false;
}

const isInvalid = {
    issue_title: self => {
        return typeof self.issue_title !== 'undefined'
            && ( typeof self.issue_title !== 'string'
                || self.issue_title.length > 1024 );
    },
    issue_text: self => {
        return typeof self.issue_text !== 'undefined'
            && ( typeof self.issue_text !== 'string'
                || self.issue_text.length > 2**16);
    },
    created_by: self => {
        return typeof self.created_by !== 'undefined'
            && ( typeof self.created_by !== 'string'
                || self.created_by.length > 64);
    },
    assigned_to: self => {
        return typeof self.assigned_to !== 'undefined'
            && ( typeof self.assigned_to !== 'string'
                || self.assigned_to.length > 64);
    },
    status_text: self => {
        return typeof self.status_text !== 'undefined'
            && ( typeof self.status_text !== 'string'
                || self.status_text.length > 1024);
    },
    open: self => {
        return typeof self.open !== 'undefined'
            && ( typeof self.open !== 'string'
                || (self.open != 'true' && self.open != 'false')
            && typeof self.open !== 'boolean' );
    },
    created_on: self => {
        return isNaN(Date.parse(self.created_on));
    },
    updated_on: self => {
        return isNaN(Date.parse(self.updated_on));
    },
    _id: self => {
        return !ObjectID.isValid(self._id);
    },
};
Insert.prototype.isNotValid = function () {
    const doc = this.doc;
    for (let field in isInvalid) {
        if (!doc[field]) continue;
        if (isInvalid[field](doc)) {
            return true;
        }
    }
    return false;
}

Insert.prototype.deleteEmptyStrings = function () {
    for (let field in this.doc) {
        if (this.doc[field] === '') {
            delete this.doc[field];
        }
    }
    return this;
}

const allowedInput = {
    issue_title: true,
    issue_text: true,
    created_by: true,
    assigned_to: true,
    status_text: true,
    open: true,
    project_name: true,
};
Insert.prototype.deleteUnexpected = function () {
    for (let field in this.doc) {
        if (!allowedInput[field]) {
            delete this.doc[field];
        }
    }
    return this;
}

const setDefaultValues = {
    _id: self => self._id = new ObjectID(),
    created_on: self => self.created_on = new Date(),
    open: self => {
        switch (self.open) {
          case 'true':
            self.open = true;
            break;
          case 'false':
            self.open = false;
            break;
          default:
            self.open = true;
        }
    }
};
Insert.prototype.setDefaults = function () {
    for (let field in setDefaultValues) {
        setDefaultValues[field](this.doc);
    }
    return this;
}

module.exports.Insert = Insert;


function Update (doc) { this.doc = doc }

Update.prototype.isNotValid =
    Insert.prototype.isNotValid;
Update.prototype.deleteEmptyStrings =
    Insert.prototype.deleteEmptyStrings;

const allowedUpdate = {
    issue_title: true,
    issue_text: true,
    created_by: true,
    assigned_to: true,
    status_text: true,
    open: true,
};
Update.prototype.deleteUnexpected = function () {
    for (let field in this.doc) {
        if (!allowedUpdate[field]) {
            delete this.doc[field];
        }
    }
    return this;
}

Update.prototype.setValues = function () {
    switch (this.doc.open) {
      case 'true':
        this.doc.open = true;
        break;
      case 'false':
        this.doc.open = false;
        break;
    }
    this.doc.updated_on = new Date();
    this.doc = {$set: this.doc};
    return this;
}

module.exports.Update = Update;


function Filter (doc, project_name) {
    doc.project_name = project_name;
    this.doc = doc;
}

Filter.prototype.isNotValid =
    Insert.prototype.isNotValid;
Filter.prototype.deleteEmptyStrings =
    Insert.prototype.deleteEmptyStrings;

const allowedFilters = {
    project_name: true,
    issue_title: true,
    issue_text: true,
    created_by: true,
    assigned_to: true,
    status_text: true,
    open: true,
    created_on: true,
    updated_on: true,
    _id: true,
};
Filter.prototype.deleteUnexpected = function () {
    for (let field in this.doc) {
        if (!allowedFilters[field]) {
            delete this.doc[field];
        }
    }
    return this;
}

Filter.prototype.setValues = function () {
    const doc = this.doc;
    if (doc._id) {
        doc._id = new ObjectID(doc._id);
    }
    doc.deleted = { $exists: false };
    return this;
}

module.exports.Filter = Filter;