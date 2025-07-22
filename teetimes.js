// teetimes.js - Auto hole assignment and tee time management

class TeeTimeManager {
    constructor() {
        this.registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
        this.teeTimeSlots = this.generateTeeTimeSlots();
        this.assignedSlots = JSON.parse(localStorage.getItem('assignedTeeSlots')) || [];
        this.init();
    }

    init() {
        this.processTeamAssignments();
        this.renderTeeSheet();
        this.renderWaitingTeams();
        this.updateStats();
        
        // Listen for new registrations
        window.addEventListener('storage', (e) => {
            if (e.key === 'registeredTeams') {
                this.registeredTeams = JSON.parse(e.newValue || '[]');
                this.processTeamAssignments();
                this.renderTeeSheet();
                this.renderWaitingTeams();
                this.updateStats();
            }
        });

        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
            this.processTeamAssignments();
            this.renderTeeSheet();
            this.renderWaitingTeams();
            this.updateStats();
        }, 30000);
    }

    generateTeeTimeSlots() {
        const slots = [];
        const startTime = new Date();
        startTime.setHours(8, 0, 0, 0); // 8:00 AM start
        
        // Generate 18 holes with 4 time slots each (8-minute intervals)
        for (let hole = 1; hole <= 18; hole++) {
            for (let timeSlot = 0; timeSlot < 4; timeSlot++) {
                const teeTime = new Date(startTime.getTime() + (timeSlot * 8 * 60000)); // 8-minute intervals
                slots.push({
                    id: `hole-${hole}-slot-${timeSlot}`,
                    hole: hole,
                    time: teeTime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                    }),
                    timeSlot: timeSlot + 1,
                    team: null,
                    players: [],
                    isAssigned: false
                });
            }
        }
        return slots;
    }

    processTeamAssignments() {
        // Find complete teams that haven't been assigned yet
        const completeTeams = this.registeredTeams.filter(team => 
            team.players && team.players.length === 4 && !team.teeTimeAssignment
        );

        completeTeams.forEach(team => {
            this.assignTeeTime(team);
        });

        // Save updated teams
        localStorage.setItem('registeredTeams', JSON.stringify(this.registeredTeams));
    }

    assignTeeTime(team) {
        // Find first available slot
        const availableSlot = this.teeTimeSlots.find(slot => !slot.isAssigned);
        
        if (availableSlot) {
            // Assign the slot
            availableSlot.isAssigned = true;
            availableSlot.team = team.name;
            availableSlot.players = team.players.map(p => p.name);

            // Update team with tee time assignment
            team.teeTimeAssignment = {
                hole: availableSlot.hole,
                time: availableSlot.time,
                timeSlot: availableSlot.timeSlot,
                slotId: availableSlot.id
            };

            // Save assignment
            this.assignedSlots.push({
                slotId: availableSlot.id,
                teamId: team.id,
                assignedAt: new Date().toISOString()
            });

            localStorage.setItem('assignedTeeSlots', JSON.stringify(this.assignedSlots));
            
            // Show notification
            this.showAssignmentNotification(team, availableSlot);
        }
    }

    showAssignmentNotification(team, slot) {
        // Create notification
        const notification = document.createElement('div');
        notification.className = 'tee-assignment-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h3>🎉 Tee Time Assigned!</h3>
                <p><strong>${team.name}</strong></p>
                <p>📍 <strong>Hole ${slot.hole}</strong> at <strong>${slot.time}</strong></p>
                <p>Players: ${slot.players.join(', ')}</p>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 8000);
    }

    renderTeeSheet() {
        const grid = document.getElementById('tee-times-grid');
        if (!grid) return;

        // Group slots by hole
        const holeGroups = {};
        this.teeTimeSlots.forEach(slot => {
            if (!holeGroups[slot.hole]) {
                holeGroups[slot.hole] = [];
            }
            holeGroups[slot.hole].push(slot);
        });

        let html = '';
        for (let hole = 1; hole <= 18; hole++) {
            const holeSlots = holeGroups[hole] || [];
            html += this.renderHoleSection(hole, holeSlots);
        }

        grid.innerHTML = html;
    }

    renderHoleSection(holeNumber, slots) {
        const isBackNine = holeNumber > 9;
        return `
            <div class="hole-section ${isBackNine ? 'back-nine' : 'front-nine'}">
                <div class="hole-header">
                    <h3>Hole ${holeNumber}</h3>
                    <span class="hole-type">${isBackNine ? 'Back 9' : 'Front 9'}</span>
                </div>
                <div class="tee-slots">
                    ${slots.map(slot => this.renderTeeSlot(slot)).join('')}
                </div>
            </div>
        `;
    }

    renderTeeSlot(slot) {
        if (slot.isAssigned) {
            return `
                <div class="tee-slot assigned">
                    <div class="tee-time">${slot.time}</div>
                    <div class="team-name">${slot.team}</div>
                    <div class="players-list">
                        ${slot.players.map(player => `<div class="player-name">${player}</div>`).join('')}
                    </div>
                    <div class="assignment-status">✅ Confirmed</div>
                </div>
            `;
        } else {
            return `
                <div class="tee-slot available">
                    <div class="tee-time">${slot.time}</div>
                    <div class="availability">Available</div>
                    <div class="waiting-message">Waiting for team...</div>
                </div>
            `;
        }
    }

    renderWaitingTeams() {
        const waitingContainer = document.getElementById('waiting-teams');
        if (!waitingContainer) return;

        const incompleteTeams = this.registeredTeams.filter(team => 
            !team.players || team.players.length < 4
        );

        if (incompleteTeams.length === 0) {
            waitingContainer.innerHTML = `
                <div class="no-waiting-teams">
                    <p>🎉 All registered teams are complete and have been assigned tee times!</p>
                </div>
            `;
            return;
        }

        waitingContainer.innerHTML = incompleteTeams.map(team => `
            <div class="waiting-team">
                <div class="team-header">
                    <h4>${team.name}</h4>
                    <span class="team-status">${team.players ? team.players.length : 0}/4 Players</span>
                </div>
                <div class="team-captain">Captain: ${team.captain} (${team.captainEmail})</div>
                <div class="registered-players">
                    ${team.players ? team.players.map(player => `
                        <span class="player-chip">${player.name}</span>
                    `).join('') : ''}
                    ${Array(4 - (team.players ? team.players.length : 0)).fill().map(() => `
                        <span class="player
