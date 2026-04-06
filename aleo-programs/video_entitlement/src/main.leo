program video_entitlement.aleo {

    record AccessRecord {
        owner: address,
        content_id: field,
        access_type: u8,
        expires_at: u64,
        views_left: u32,
        nonce: field,
    }

    mapping revoked_nonces: field => bool;
    mapping registered_content: field => bool;

    fn grant_access(
        recipient: address,
        content_id: field,
        access_type: u8,
        expires_at: u64,
        views_left: u32,
        nonce: field,
    ) -> AccessRecord {
        assert(access_type >= 1u8);
        assert(access_type <= 5u8);
        return AccessRecord {
            owner: recipient,
            content_id: content_id,
            access_type: access_type,
            expires_at: expires_at,
            views_left: views_left,
            nonce: nonce,
        };
    }

    fn validate_access(
        input: AccessRecord,
        content_id: field,
        current_ts: u64,
    ) -> AccessRecord {
        assert_eq(input.content_id, content_id);
        let not_expired: bool = (input.expires_at == 0u64) || (current_ts < input.expires_at);
        assert(not_expired);
        return AccessRecord {
            owner: input.owner,
            content_id: input.content_id,
            access_type: input.access_type,
            expires_at: input.expires_at,
            views_left: input.views_left,
            nonce: input.nonce,
        };
    }

    fn consume_view(
        input: AccessRecord,
        content_id: field,
        current_ts: u64,
        new_nonce: field,
    ) -> AccessRecord {
        assert_eq(input.content_id, content_id);
        assert(input.views_left > 0u32);
        let not_expired: bool = (input.expires_at == 0u64) || (current_ts < input.expires_at);
        assert(not_expired);
        return AccessRecord {
            owner: input.owner,
            content_id: input.content_id,
            access_type: input.access_type,
            expires_at: input.expires_at,
            views_left: input.views_left - 1u32,
            nonce: new_nonce,
        };
    }

    fn renew_access(
        input: AccessRecord,
        new_expires: u64,
        new_nonce: field,
    ) -> AccessRecord {
        assert(new_expires > 0u64);
        return AccessRecord {
            owner: input.owner,
            content_id: input.content_id,
            access_type: input.access_type,
            expires_at: new_expires,
            views_left: input.views_left,
            nonce: new_nonce,
        };
    }

    fn revoke_access(public nonce: field) -> Final {
        return final {
            revoked_nonces.set(nonce, true);
        };
    }

    fn register_content(public content_id: field) -> Final {
        return final {
            registered_content.set(content_id, true);
        };
    }
}