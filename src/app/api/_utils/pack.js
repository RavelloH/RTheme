function pack(userinfo, timestamp) {
    return {
        uid: userinfo.uid,
        username: userinfo.username,
        nickname: userinfo.nickname,
        email: userinfo.email,
        emailVerified: userinfo.emailVerified,
        bio: userinfo.bio,
        birth: userinfo.birth,
        country: userinfo.country,
        role: userinfo.role,
        updatedAt: userinfo.updatedAt,
        createdAt: userinfo.createdAt,
        lastUseAt: timestamp + '',
        gender: userinfo.gender,
        avatar: userinfo.avatar,
        website: userinfo.website,
    };
}

export default pack;
