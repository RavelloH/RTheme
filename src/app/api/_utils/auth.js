import token from './token';

function auth(request) {
    const tokenString = request.headers.get('authorization').split(' ')[1];
    let tokenInfo;
    try {
        tokenInfo = token.verify(tokenString);
        return tokenInfo;
    } catch (err) {
        return;
    }
}

export default auth;
