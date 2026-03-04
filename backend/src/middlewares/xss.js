import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Middleware to sanitize deeply nested objects replacing the buggy xss-clean
 */
const clean = (data) => {
    let isObject = false;
    if (typeof data === 'object') {
        isObject = true;
    }

    if (!isObject) {
        if (typeof data === 'string') {
            return DOMPurify.sanitize(data);
        }
        return data;
    }

    if (Array.isArray(data)) {
        return data.map((item) => clean(item));
    }

    const cleanedObj = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            cleanedObj[key] = clean(data[key]);
        }
    }
    return cleanedObj;
};

const xssSanitizer = () => {
    return (req, res, next) => {
        if (req.body) req.body = clean(req.body);
        if (req.query) req.query = clean(req.query);
        if (req.params) req.params = clean(req.params);
        next();
    };
};

export default xssSanitizer;
