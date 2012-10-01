/**
 Copyright (c) 2011  Rally Software Development Corp.  All rights reserved
 */

KanbanPolicy = function(rallyDataSource, callback) {


    var that = this;
    var workspacePrefRef, projectPrefRef, fieldName, policyDesc;

    that._updatePolicyPref = function(currentPrefs) {
        currentPrefs.fieldInfos[fieldName].policy = policyDesc;
        that._storeValues(currentPrefs);
    };

    that.savePolicy = function(field, policy) {
        fieldName = field;
        policyDesc = dojo.trim(policy);
        that._retrievePreferences(that._updatePolicyPref);
    };

    that._retrievePreferences = function(prefCallback) {
        function getProjectOrWorkspacePref(results) {
            var workspacePref, projectPref, currentPrefs;

            if (results.length) {
                dojo.forEach(results, function(p) {
                    if (p.Project) {
                        //projectOid is a string need both strings to compare.
                        var projectRef = rally.sdk.util.Ref.getOidFromRef(p.Project) + "";
                        if (projectRef === rallyDataSource.projectOid) {
                            projectPref = p;
                            projectPrefRef = projectPref._ref;
                        }
                    }
                    if (p.Workspace) {
                        workspacePref = p;
                        workspacePrefRef = p._ref;
                    }
                });
                if (projectPref) {
                    currentPrefs = projectPref.Value;
                }
                else if (workspacePref) {
                    currentPrefs = workspacePref.Value;
                }
            }
            prefCallback(currentPrefs);
        }
        rallyDataSource.preferences.getAppPreferences(getProjectOrWorkspacePref);
    };

    that._storeValues = function(values) {
        function successCallback(results) {
            callback(policyDesc);
        }

        function errorProjectCallback(results) {
            rally.Logger.warn(results);
            if (results.Errors.length > 0) {
                var error = results.Errors[0];
                if (error.match(/user does not have preference write permission/i)) {
                    error = "You must have Editor permissions to set up the Kanban Board for the current project.";
                }
                rally.sdk.ui.AppHeader.showMessage("error", error, 10000);
                callback(null);
            }
        }

        if (!projectPrefRef) {
            rally.sdk.ui.AppHeader.showMessage("error", "You must set up a Kanban Board before creating column policies.", 10000);
        }
        else {

            var pref = {_ref : projectPrefRef,
                Value: values
            };
            rallyDataSource.preferences.update(pref, successCallback, errorProjectCallback);
        }

    };

};