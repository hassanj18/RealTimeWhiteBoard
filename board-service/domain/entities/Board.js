class Board {
    constructor({ id, name, description, owner, participants = [], activeParticipants = [], createdAt, updatedAt }) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.owner = owner;
        this.participants = participants;
        this.activeParticipants = activeParticipants;
        this.createdAt = createdAt || new Date();
        this.updatedAt = updatedAt || new Date();
    }

    validateOwnership(userId) {
        if (this.owner !== userId) {
            throw new Error('Unauthorized: Only the owner can perform this action');
        }
    }

    validateParticipantExists(participantId) {
        const participant = this.participants.find(p => p.userId === participantId);
        if (!participant) {
            throw new Error('Participant not found');
        }
        return participant;
    }

    validateAccessLevel(access) {
        if (!['view', 'edit'].includes(access)) {
            throw new Error('Invalid access level: must be view or edit');
        }
    }

    getUserAccess(userId) {
        if (this.owner === userId) {
            return {
                access: ['view', 'edit'],
                role: 'owner'
            };
        }

        const participant = this.participants.find(p => p.userId === userId);
        if (participant) {
            return {
                access: [participant.access],
                role: 'participant'
            };
        }

        const activeParticipant = this.activeParticipants.find(p => p.userId === userId);
        if (activeParticipant) {
            return {
                access: ['view'],
                role: 'active'
            };
        }

        throw new Error('User not found in board');
    }

    changeParticipantAccess(participantId, newAccess, requestingUserId) {
        this.validateOwnership(requestingUserId);
        this.validateAccessLevel(newAccess);
        const participant = this.validateParticipantExists(participantId);
        
        participant.access = newAccess;
        this.updatedAt = new Date();
        
        return participant;
    }

    addParticipant(userId, access = 'view') {
        this.validateAccessLevel(access);
        
        const existingParticipant = this.participants.find(p => p.userId === userId);
        if (existingParticipant) {
            throw new Error('Participant already exists');
        }

        this.participants.push({
            userId,
            access
        });
        
        this.updatedAt = new Date();
    }

    removeParticipant(userId, requestingUserId) {
        this.validateOwnership(requestingUserId);
        
        const index = this.participants.findIndex(p => p.userId === userId);
        if (index === -1) {
            throw new Error('Participant not found');
        }

        this.participants.splice(index, 1);
        this.updatedAt = new Date();
    }

    addActiveParticipant(userId, userName) {
        const existingActiveParticipant = this.activeParticipants.find(p => p.userId === userId);
        if (existingActiveParticipant) {
            throw new Error('Active participant already exists');
        }

        this.activeParticipants.push({
            userId: userId,
            userName: userName,
            joinedAt: new Date().toISOString()
        });
        
        this.updatedAt = new Date();
    }

    removeActiveParticipant(userId) {
        const index = this.activeParticipants.findIndex(p => p.userId === userId);
        if (index === -1) {
            throw new Error('Active participant not found');
        }

        this.activeParticipants.splice(index, 1);
        this.updatedAt = new Date();
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            owner: this.owner,
            participants: this.participants,
            activeParticipants: this.activeParticipants,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Board;
