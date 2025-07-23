// starting-tee.js - Auto hole assignment when teams reach 4 players
class StartingTeeManager {
    constructor() {
        this.teams = JSON.parse(localStorage.getItem('tournament-teams')) || [];
        this.registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
        this.availableHoles = this.generateAvailableHoles();
        this.assignedHoles = JSON.parse(localStorage.getItem('assigned-holes')) || [];
        this.init();
    }
    
    init() {
        this.syncTeamData();
        this.renderHoleAssignments();
        this.renderFormingTeams();
        this.updateStats();
        this.setupEventListeners();
        
        // Auto-refresh every 15 seconds
        setInterval(() => {
            this.refreshData();
        }, 15000);
    }
    
    setupEventListeners() {
        // Listen for new player registrations
        window.addEventListener('playerRegistered', (event) => {
            this.handlePlayerRegistration(event.detail);
        });
        
        // Listen for team completion
        window.addEventListener('teamComplete', (event) => {
            this.handleTeamComplete(event.detail);
        });
        
        // Listen for storage changes (new registrations from other tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === 'registeredTeams' || e.key === 'tournament-teams') {
                this.refreshData();
            }
        });
    }
    
    generateAvailableHoles() {
        const holes = [];
        const startTime = new Date();
        startTime.setHours(8, 0, 0, 0); // 8:00 AM start
        
        // Generate 18 holes with staggered start times
        for (let hole = 1; hole <= 18; hole++) {
            holes.push({
                hole: hole,
                startTime: new Date(startTime.getTime() + (hole - 1) * 8 * 60000), // 8-minute intervals
                team: null,
                isAssigned: false,
                id: `hole-${hole}`,
                par: this.getHolePar(hole)
            });
        }
        return holes;
    }
    
    getHolePar(holeNumber) {
        // Standard par layout - you can customize this
        const pars = [4,3,5,4,4,3,4,5,4,4,3,5,4,4,3,4,5,4];
        return pars[holeNumber - 1] || 4;
    }
    
    syncTeamData() {
        // Sync data from both storage locations
        this.registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
        this.teams = JSON.parse(localStorage.getItem('tournament-teams')) || [];
        
        // Merge registered teams into tournament teams if not already there
        this.registeredTeams.forEach(regTeam => {
            const existingTeam = this.teams.find(t => t.id === regTeam.id);
            if (!existingTeam) {
                const tournamentTeam = {
                    id: regTeam.id,
                    name: regTeam.name,
                    captain: regTeam.captain || regTeam.captainName,
                    captainEmail: regTeam.captainEmail,
                    players: regTeam.players || [],
                    isComplete: (regTeam.players && regTeam.players.length === 4),
                    holeAssignment: regTeam.holeAssignment || null,
                    registrationTime: regTeam.registrationDate || new Date().toISOString()
                };
                this.teams.push(tournamentTeam);
            }
        });
        
        this.saveTeams();
    }
    
    handlePlayerRegistration(playerData) {
        console.log('Handling player registration:', playerData);
        
        // Find or create team
        let team = this.teams.find(t => t.name.toLowerCase() === playerData.teamName.toLowerCase());
        
        if (!team) {
            team = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: playerData.teamName,
                captain: playerData.isTeamCaptain ? playerData.name : '',
                captainEmail: playerData.isTeamCaptain ? playerData.email : '',
                players: [],
                isComplete: false,
                holeAssignment: null,
                registrationTime: new Date().toISOString()
            };
            this.teams.push(team);
        }
        
        // Add player if not already in team and team isn't full
        const playerExists = team.players.find(p => p.email === playerData.email);
        if (team.players.length < 4 && !playerExists) {
            team.players.push({
                name: playerData.name,
                email: playerData.email,
                phone: playerData.phone || '',
                isTeamCaptain: playerData.isTeamCaptain || false,
                registrationTime: new Date().toISOString()
            });
            
            // Update captain info if this is the captain
            if (playerData.isTeamCaptain) {
                team.captain = playerData.name;
                team.captainEmail = playerData.email;
            }
        }
        
        // Check if team is now complete (4 players)
        if (team.players.length === 4 && !team.isComplete) {
            this.assignHoleToTeam(team);
        }
        
        this.saveTeams();
        this.renderHoleAssignments();
        this.renderFormingTeams();
        this.updateStats();
    }
    
    handleTeamComplete(teamData) {
        const team = this.teams.find(t => t.id === teamData.team.id);
        if (team && !team.isComplete) {
            this.assignHoleToTeam(team);
        }
    }
    
    assignHoleToTeam(team) {
        // Find first available hole
        const availableHole = this.availableHoles.find(hole => !hole.isAssigned);
        
        if (availableHole) {
            // Assign the hole
            availableHole.isAssigned = true;
            availableHole.team = team;
            
            // Update team
            team.isComplete = true;
            team.holeAssignment = {
                hole: availableHole.hole,
                startTime: availableHole.startTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                par: availableHole.par,
                assignedAt: new Date().toISOString()
            };
            
            // Save assignment
            this.assignedHoles.push({
                teamId: team.id,
                holeNumber: availableHole.hole,
                assignedAt: new Date().toISOString()
            });
            
            localStorage.setItem('assigned-holes', JSON.stringify(this.assignedHoles));
            
            // Show notification
            this.showAssignmentNotification(team, availableHole);
            
            // Trigger event for other components
            window.dispatchEvent(new CustomEvent('holeAssigned', {
                detail: { team: team, hole: availableHole }
            }));
            
            this.saveTeams();
            this.renderHoleAssignments();
        }
    }
    
    showAssignmentNotification(team, hole) {
        const notification = document.createElement('div');
        notification.className = 'hole-assignment-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">🎉</div>
                <div class="notification-text">
                    <h3>Team Complete!</h3>
                    <p><strong>${team.name}</strong> has been assigned:</p>
                    <p class="hole-info">
                        <strong>Hole ${hole.hole}</strong> at 
                        <strong>${hole.startTime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        })}</strong>
                    </p>
                    <div class="player-list">
                        ${team.players.map(p => `<span class="player-chip">${p.name}</span>`).join('')}
                    </div>
                </div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add to notifications container
        const container = document.getElementById('notifications-container') || document.body;
        container.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }
    
    renderHoleAssignments() {
        const frontNine = document.getElementById('front-nine');
        const backNine = document.getElementById('back-nine');
        
        if (!frontNine || !backNine) return;
        
        // Render front 9 (holes 1-9)
        frontNine.innerHTML = '';
        for (let hole = 1; hole <= 9; hole++) {
            const holeData = this.availableHoles.find(h => h.hole === hole);
            frontNine.appendChild(this.createHoleCard(holeData));
        }
        
        // Render back 9 (holes 10-18)
        backNine.innerHTML = '';
        for (let hole = 10; hole <= 18; hole++) {
            const holeData = this.availableHoles.find(h => h.hole === hole);
            backNine.appendChild(this.createHoleCard(holeData));
        }
    }
    
    createHoleCard(holeData) {
        const card = document.createElement('div');
        const isNext = !holeData.isAssigned && this.availableHoles.filter(h => !h.isAssigned)[0]?.hole === holeData.hole;
        
        card.className = `hole-card ${holeData.isAssigned ? 'assigned' : 'available'} ${isNext ? 'next-available' : ''}`;
        
        if (holeData.isAssigned && holeData.team) {
            card.innerHTML = `
                <div class="hole-header">
                    <div class="hole-number">Hole ${holeData.hole}</div>
                    <div class="hole-par">Par ${holeData.par}</div>
                </div>
                <div class="hole-time">
                    🕐 ${holeData.startTime.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    })}
                </div>
                <div class="assigned-team">
                    <div class="team-name">🏌️ ${holeData.team.name}</div>
                    <div class="team-captain">Captain: ${holeData.team.captain}</div>
                </div>
                <div class="team-players">
                    ${holeData.team.players.map(p => `
                        <div class="player-item">${p.name}</div>
                    `).join('')}
                </div>
                <div class="assignment-status">✅ Assigned</div>
            `;
        } else {
            card.innerHTML = `
                <div class="hole-header">
                    <div class="hole-number">Hole ${holeData.hole}</div>
                    <div class="hole-par">Par ${holeData.par}</div>
                </div>
                <div class="hole-time">
                    🕐 ${holeData.startTime.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    })}
                </div>
                <div class="available-status">
                    ${isNext ? '⭐ Next Available' : '🟢 Available'}
                </div>
                <div class="waiting-message">Waiting for team...</div>
            `;
        }
        
        return card;
    }
    
    renderFormingTeams() {
        const container = document.getElementById('forming-teams');
        if (!container) return;
        
        const incompleteTeams = this.teams.filter(team => 
            team.players.length < 4 && team.players.length > 0
        );
        
        if (incompleteTeams.length === 0) {
            container.innerHTML = `
                <div class="no-forming-teams">
                    <div class="empty-state">
                        <h3>🎉 All teams are complete!</h3>
                        <p>Every registered team has 4 players and hole assignments.</p>
                        <a href="register.html" class="btn btn-primary">Start a New Team</a>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = incompleteTeams.map(team => this.createTeamCard(team)).join('');
    }
    
    createTeamCard(team) {
        const progressPercentage = (team.players.length / 4) * 100;
        const playersNeeded = 4 - team.players.length;
        
        return `
            <div class="forming-team-card">
                <div class="team-header">
                    <h4>${team.name}</h4>
                    <div class="team-progress-badge">${team.players.length}/4</div>
                </div>
                <div class="team-captain">
                    <strong>Captain:</strong> ${team.captain || 'TBD'} 
                    ${team.captainEmail ? `(${team.captainEmail})` : ''}
                </div>
                <div class="registered-players">
                    <strong>Players:</strong>
                    <div class="players-list">
                        ${team.players.map(player => `
                            <span class="player-chip">${player.name}</span>
                        `).join('')}
                        ${Array(playersNeeded).fill().map(() => `
                            <span class="player-chip empty">Open Slot</span>
                        `).join('')}
                    </div>
                </div>
                <div class="team-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                    <div class="progress-text">
                        Need ${playersNeeded} more player${playersNeeded !== 1 ? 's' : ''} for hole assignment
                    </div>
                </div>
                <div class="team-actions">
                    <a href="register.html" class="btn btn-secondary btn-small">Join This Team</a>
                </div>
            </div>
        `;
    }
    
    updateStats() {
        const completeTeams = this.teams.filter(team => team.isComplete).length;
        const totalPlayers = this.teams.reduce((sum, team) => sum + team.players.length, 0);
        const holesAssigned = this.availableHoles.filter(hole => hole.isAssigned).length;
        
        // Update stat displays
        const completeTeamsEl = document.getElementById('complete-teams');
        const totalPlayersEl = document.getElementById('total-players');
        const holesAssignedEl = document.getElementById('holes-assigned');
        
        if (completeTeamsEl) completeTeamsEl.textContent = completeTeams;
        if (totalPlayersEl) totalPlayersEl.textContent = totalPl
