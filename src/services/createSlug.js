module.exports = function createSlug(text = "") {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "") // remove special chars
        .replace(/\s+/g, "-")         // replace spaces with -
        .replace(/-+/g, "-");         // remove multiple -
};
