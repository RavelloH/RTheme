function objectToForm(obj) {
    var formData = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            var encodedKey = encodeURIComponent(key);
            var encodedValue = encodeURIComponent(obj[key]);
            formData.push(encodedKey + '=' + encodedValue);
        }
    }
    return formData.join('&');
}
export default objectToForm;
