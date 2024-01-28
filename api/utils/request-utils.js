let {
    PAGINATION_MAX_LIMIT,
    PAGINATION_DEFAULT_LIMIT,
    PAGINATION_DEFAULT_OFFSET,
    SORT_DIRECTION,
    CHAINID_DEFAULT,
    KEYWORD_DEFAULT, 
    CREATOR_DEFAULT
  } = require("../../config/constants");
const config = require("../../config/config");

  
  function getLimit(options) {
    let limit = parseInt(options.limit, 10) || PAGINATION_DEFAULT_LIMIT;
    limit = limit > PAGINATION_MAX_LIMIT ? PAGINATION_MAX_LIMIT : limit;
    return limit;
  }
  
  function getOffset(options) {
    let offset = PAGINATION_DEFAULT_OFFSET;
    if (options.offset) offset = parseInt(options.offset, 10);
    return offset;
  }

  function getChainID(options) {
    let chainID = CHAINID_DEFAULT;
    if (options.chainID) chainID = options.chainID;
    
    return chainID;
  }

  function getFileURL(file) {
    return file ? `http://localhost:${config.port}/public/` + file.filename : ""
  }

  function getKeyword(options, query) {
    let keyword = KEYWORD_DEFAULT;
    if (options[query]) keyword = options[query];
    
    return keyword;
  }

  function getSortBy(options, defaultArg) {
    // required query param sort with +/-field
    let sort = options.sort || defaultArg || "+id";
  
    if (sort === "") {
      return {};
    }
  
    let orderBy = {};
    if (sort.startsWith("-")) {
      orderBy[sort.substring(1)] = SORT_DIRECTION.DESC;
    } else if (sort.startsWith(" ") || sort.startsWith("+")) {
      orderBy[sort.substring(1)] = SORT_DIRECTION.ASC;
    } else {
      orderBy[sort] = SORT_DIRECTION.DESC;
    }
    
    console.log(orderBy)
    return orderBy;
  }
  
  function getSearchObj(options) {
    // required query param search with field:value,field:value,...
    let searchStr = options.search || "";
    if (searchStr === "") {
      return {};
    }
    searchStr = '{"' + searchStr.replace(/:/g, '":"').replace(/,/g, '","') + '"}';
    let searchObj = JSON.parse(searchStr);
    let where = [];
    for (let key in searchObj) {
      let temp = {};
      temp[key] = { contains: searchObj[key] };
      where.push(temp);
    }
    return where;
  }
  
  function hasNextPage({ limit, offset, count }) {
    // accepts options with keys limit, offset, count
    if (offset + limit >= count) {
      return false;
    }
    return true;
  }
  
  module.exports = {
    getLimit,
    getOffset,
    getSortBy,
    getSearchObj,
    hasNextPage,
    getChainID,
    getFileURL,
    getKeyword,
  };
  