import jwt from 'jsonwebtoken';

const token = {
    sign: function (inner, expired = '7d') {
        return jwt.sign(inner, process.env.JWT_KEY, {
            algorithm: 'RS512',
            expiresIn: expired,
        });
    },
    verify: function (tokenText) {
        return jwt.verify(tokenText, process.env.JWT_PUB_KEY, {
            algorithm: 'RS512',
        });
    },
};

export default token;
