export const updateKeyInContent = (
  content: string,
  key: string,
  newValue: string,
) => {
  var rgx = new RegExp('^'+key + "::(\\d+)",'m');
  const foundContentMatch = rgx.exec(content)
  if (foundContentMatch != null) {
    var org_value = foundContentMatch![1]
    var result = content.replace(rgx, key + "::" + (parseInt(newValue) + parseInt(org_value)))
    return result;
  } else {
    var rgx2 = new RegExp("([\[\(])" + key + "::(\\d+)");
    const foundContentMatch2 = rgx2.exec(content)
    if (foundContentMatch2 != null) {
      var org_value2 = foundContentMatch2![2]
      var result2 = content.replace(rgx2, foundContentMatch2![1] + key + "::" + (parseInt(newValue) + parseInt(org_value2)))
      return result2;
    }
  }
  return content;
};

export const updateKeyInFrontMatter = (
  content: string,
  key: string,
  newValue: string,
) => {
  var rgx = new RegExp(key + ": (\\d+)", "g");
  const foundContentMatch = rgx.exec(content)
  var org_value = foundContentMatch![1]
  var result = content.replace(rgx, key + ": " + (parseInt(newValue) + parseInt(org_value)))

  return result;
};