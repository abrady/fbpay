// This is an example of hooking up a request handler with a specific request
// path and HTTP verb using the Express routing API.
var fbconfig = require('cloud/fbconfig.js');

fbconfig.app_id || console.error("must set app_id in fbconfig.js");
fbconfig.app_secret || console.error("must set app_secret in fbconfig.js")
fbconfig.graph_URL = fbconfig.graph_URL || 'https://graph.facebook.com';
/**
* request an app access token. this can be used for a variety of
* app scoped calls to graph.facebook.com.
*/
exports.appAccessTokenRequest = function(res_cb, err_cb) {
  // app access token is cached until developer changes
  // their app secret
  if (fbconfig.app_access_token) {
    res_cb(fbconfig.app_access_token);
    return;
  }
  var params = {
      client_id:fbconfig.app_id,
      client_secret:fbconfig.app_secret,
      grant_type:'client_credentials',
    };
  Parse.Cloud.httpRequest({
    url: fbconfig.graph_URL+'/oauth/access_token',
    params: params,
    method: 'get',
    success: function(res_buf) {
      res_data = res_buf.text;
      var res_access_token = null;
      // if a well formed response this data is of the form:
      // access_token=<rest of access token>
      var s = res_data.split('=');
      if (s.length == 2 && s[0] === 'access_token' ) {
        res_access_token = s[1];
      }
      fbconfig.app_access_token = res_access_token;
      res_cb(res_access_token);
    },
    error: err_cb || function(error) {
      console.error("appAccessToken: default error callback invoked"+JSON.stringify(error));
    }
  });
}


/**
* helper function for making http requests to graph.facebook.com
* automatically appends an app access token to the params
* @param path : the graph path, e.g. /me/groups
* @param params : dict of request params, e.g. { parent : app_id }
* @param method : http request method 'get', 'post', 'delete', etc.
*/
exports.graphRequest = function (path, params, method, res_cb, err_cb) {
  if (path && path[0] != '/') {
    path = '/' + path;
  }
  var options = {
    url: fbconfig.graph_URL+'/'+path,
    success: function(httpResponse) {
      //console.log('graphRequest('+path+') success: '+httpResponse.text);
      res_cb(JSON.parse(httpResponse.text));
    },
    error: err_cb || function(e) {
      console.error(e);
    }
  }
  if (params) {
    options.params = params;
  } else {
    options.params = {};
  }
  if (method) {
    options.method = method;
  }
  exports.appAccessTokenRequest(
    function(app_access_token) {
      options.params.access_token = app_access_token;
      Parse.Cloud.httpRequest(options);
    },
    err_cb
  );
}

/**
* Helper for making a GET call to graph.facebook.com
* the app access token.
* @see graphRequest
*/
exports.graphGet = function (path, params, res_cb, err_cb) {
  exports.graphRequest(path, params, 'get', res_cb, err_cb);
}

/**
* Helper for making a POST call to graph.facebook.com
* @see graphRequest
*/
exports.graphPost = function (path, params, res_cb, err_cb) {
  exports.graphRequest(path, params, 'post', res_cb, err_cb);
}

/**
 * Helper for making a DELETE call to graph.facebook.com
 * @see graphRequest
 */
exports.graphDelete = function (path, res_cb, err_cb) {
  exports.graphRequest(path, {}, 'delete', res_cb, err_cb);
}


_GroupPrivacyEnum = {
    OPEN: 'open',
    CLOSED: 'closed',
    // PRIVATE: 'private' -- not allowed
};

exports.GameGroups = {
  GroupPrivacyEnum: _GroupPrivacyEnum,

  /**
   * Create a group.
   * @result: JSON of the form
   * {"id":"new_group_id"}
   */
  create: function(name, description_opt, privacy_opt, admin_id_opt, res_cb, err_cb) {
    var create_fn = function(app_access_token) {
      if (!privacy_opt in _GroupPrivacyEnum) {
        throw new Error('invalid group create privacy param '+privacy);
      }
      if (!name) {
        throw new Error('name is required param');
      }
      if (!app_access_token) {
        throw new Error('app access token required');
      }
      var path = '/'+fbconfig.app_id+'/groups';
      var params = {
        name: name,
        access_token: app_access_token
      };
      if (description_opt) {
        params.description = description_opt;
      }
      if (privacy_opt) {
        params.privacy = privacy_opt;
      }
      if (admin_id_opt) {
        params.admin = admin_id_opt;
      }
      exports.graphRequest(
        path,
        params,
        'post',
        res_cb,
        err_cb
      );  
    };
    if (fbconfig.app_access_token) {
      create_fn(fbconfig.app_access_token);
    } else {
      exports.appAccessTokenRequest(create_fn);
    }
  },

  /**
   * Get groups owned by an app. This data may be paged, make sure to check the 'next'
   * param in the result and invoke that if you need more data.
   * @result: JSON of the form
   * {
   *    data:[{"name":"asdf","id":"1234"},{"name":"...","id":"..."} },...],
   *    paging:{"cursors":{"after":"...","before":"..."}}
   *    previous: "fb url" # optional
   *    next:     "fb url" # optional, only if more pages
   * }"
   */
  getPaged:  function(res_cb, err_cb) {
    exports.graphGet(
      fbconfig.app_id+'/groups', 
      {}, 
      res_cb,
      err_cb
    ); 
  },

  /**
   * Get all groups associated with an app (i.e. page in all groups)
   * @result: array of dicts with 'name' and 'id' fields
   *   [{"name":"asdf","id":"1234"},{"name":"...","id":"..."} },...]
   * @see getPaged
   */
  getAll: function(res_cb, err_cb) {
    var res_groups = null;
    var getter_cb = function(paged_data) {
      if(res_groups){
        //console.log('adding groups to list');
        paged_data.data.forEach(function(v) {
          res_groups.push(v);
        });
      } else{
        res_groups = paged_data.data;
      }
      //console.log('res_groups(1):'+JSON.stringify(res_groups));

      // if we have more data, grab that
      if (paged_data.next) {
        // console.log('getAll:next page');
        Parse.Cloud.httpRequest({
          url: paged_data.next,
          success: function(httpResponse) {
            getter_cb(JSON.parse(httpResponse.text));
          },
          error: err_cb || function(e) {
            console.error(e);
          }
        });
      } else {
        //console.log('res_groups(2):'+JSON.stringify(res_groups));
        res_cb(res_groups);
      }
    }
    exports.GameGroups.getPaged(getter_cb, err_cb);    
  },

  /**
   * delete the passed groups
   * @param groups: an array if ids to delete
   */
  delete: function(group_id, res_cb, err_cb) {
    // console.log('groups.delete');
    exports.graphDelete(
      fbconfig.app_id+'/groups/'+group_id,
      res_cb,
      err_cb
    );
  }
}; // exports.GameGroups
