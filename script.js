// script.js - Enhanced with auto hole assignment functionality
class TournamentManager {
    constructor() {
        this.registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
        this.tournamentTeams = JSON.parse(localStorage.getItem('tournament-teams')) || [];
        this.teamScores = JSON.parse(localStorage.getItem('teamScores')) || {};
        this.currentTotal = 85;
        this.init();
    }
    
    init() {
        const currentPage = window.location.pathname.split('/').pop();
        console.log('Current page:', currentPage);
        
        switch(currentPage) {
            case 'register.html':
                this.initializeRegistration();
                break;
            case 'scoreboard.html':
                this.initializeScoreboard();
                break;
            case 'starting-tee.html':
                this.initializeStartingTee();
                break;
            default:
                break;
        }
    }
    
    // Registration Functions
    initializeRegistration() {
        this.setupRegistrationEvents();
        this.updateIndividualTotal();
    }
    
    setupRegistrationEvents() {
        // Team name availability check
        const teamNameInput = document.getElementById('teamName');
        if (teamNameInput) {
            teamNameInput.addEventListener('input', () => this.checkTeamNameAvailability());
        }
        
        // Form submission
        const registrationForm = document.getElementById('playerRegistrationForm');
        if (registrationForm) {
            registrationForm.addEventListener('submit', (e) => this.handlePlayerRegistration(e));
        }
        
        // Payment completion
        const paymentBtn = document.getElementById('submit-payment');
        if (paymentBtn) {
            paymentBtn.addEventListener('click', () => this.completeRegistration());
        }
    }
    
    showExistingTeam() {
        document.getElementById('existing-team-search').style.display = 'block';
        document.getElementById('new-team-form').style.display = 'none';
        document.getElementById('payment-section').style.display = 'none';
        this.updateButtonStates('existing');
    }
    
    showNewTeam() {
        document.getElementById('existing-team-search').style.display = 'none';
        document.getElementById('new-team-form').style.display = 'block';
        document.getElementById('payment-section').style.display = 'none';
        this.updateButtonStates('new');
    }
    
    updateButtonStates(activeType) {
        const buttons = document.querySelectorAll('.registration-options button');
        buttons.forEach(btn => btn.classList.remove('active'));
        
        if (activeType === 'existing') {
            buttons[0].classList.add('active');
        } else {
            buttons[1].classList.add('active');
        }
    }
    
    searchTeam() {
        const searchTerm = document.getElementById('teamSearch').value.toLowerCase().trim();
        const results = document.getElementById('teamSearchResults');
        
        if (!searchTerm) {
            results.innerHTML = '<p class="search-message">Please enter a team name to search.</p>';
            return;
        }
        
        const foundTeams = this.registeredTeams.filter(team =>
            team.name.toLowerCase().includes(searchTerm)
        );
        
        if (foundTeams.length > 0) {
            results.innerHTML = '<h3>Found Teams:</h3>' +
                foundTeams.map(team => `
                    <div class="team-result-card">
                        <div class="team-info">
                            <h4>${team.name}</h4>
                            <p>Captain: ${team.captain}</p>
                            <p>Players: ${team.players ? team.players.length : 0}/4</p>
                            <p>Email: ${team.captainEmail}</p>
                        </div>
                        <div class="team-actions">
                            ${team.players && team.players.length < 4 ?
                                `<button onclick="tournamentManager.showJoinTeamForm('${team.id}')" class="btn btn-primary">Join This Team</button>` :
                                `<span class="team-full-badge">Team Full</span>`
                            }
                        </div>
                    </div>
                `).join('');
        } else {
            results.innerHTML = `
                <div class="no-results-card">
                    <p>No teams found matching "${searchTerm}".</p>
                    <p>Try creating a new team instead.</p>
                    <button onclick="tournamentManager.showNewTeam()" class="btn btn-secondary">Create New Team</button>
                </div>
            `;
        }
    }
    
    checkTeamNameAvailability() {
        const teamName = document.getElementById('teamName').value.trim();
        const statusDiv = document.getElementById('teamNameStatus');
        
        if (teamName.length === 0) {
            statusDiv.textContent = '';
            statusDiv.className = 'team-status-message';
            return true;
        }
        
        const exists = this.registeredTeams.some(team =>
            team.name.toLowerCase() === teamName.toLowerCase()
        );
        
        if (exists) {
            statusDiv.textContent = '❌ This team name is already taken. Please choose another.';
            statusDiv.className = 'team-status-message status-existing';
            return false;
        } else {
            statusDiv.textContent = '✅ Team name is available!';
            statusDiv.className = 'team-status-message status-new';
            return true;
        }
    }
    
    updateIndividualTotal() {
        let total = 85; // Base registration fee
        
        const mulliganCheckbox = document.getElementById('personalMulligan');
        const stringCheckbox = document.getElementById('personalPuttingString');
        const mulliganLine = document.getElementById('mulligan-line');
        const stringLine = document.getElementById('string-line');
        
        if (mulliganCheckbox && mulliganCheckbox.checked) {
            total += 10;
            if (mulliganLine) mulliganLine.style.display = 'flex';
        } else {
            if (mulliganLine) mulliganLine.style.display = 'none';
        }
        
        if (stringCheckbox && stringCheckbox.checked) {
            total += 5;
            if (stringLine) stringLine.style.display = 'flex';
        } else {
            if (stringLine) stringLine.style.display = 'none';
        }
        
        this.currentTotal = total;
        
        const totalElement = document.getElementById('individualTotal');
        const buttonTotal = document.getElementById('button-total');
        
        if (totalElement) totalElement.textContent = total;
        if (buttonTotal) buttonTotal.textContent = total;
        
        return total;
    }
    
    handlePlayerRegistration(e) {
        e.preventDefault();
        
        // Validate team name
        if (!this.checkTeamNameAvailability()) {
            document.getElementById('teamName').focus();
            return;
        }
        
        // Collect form data
        const playerData = {
            name: document.getElementById('playerName').value.trim(),
            email: document.getElementById('playerEmail').value.trim(),
            phone: document.getElementById('playerPhone').value.trim(),
            teamName: document.getElementById('teamName').value.trim(),
            isTeamCaptain: document.getElementById('isTeamCaptain').checked,
            addOns: {
                mulligan: document.getElementById('personalMulligan').checked,
                puttingString: document.getElementById('personalPuttingString').checked
            },
            total: this.currentTotal,
            registrationTime: new Date().toISOString()
        };
        
        // Validate required fields
        if (!playerData.name || !playerData.email || !playerData.phone || !playerData.teamName) {
            alert('Please fill in all required fields.');
            return;
        }
        
        // Store player data temporarily for payment
        sessionStorage.setItem('pendingPlayerRegistration', JSON.stringify(playerData));
        
        // Show payment section
        this.showPaymentSection(playerData);
    }
    
    showPaymentSection(playerData) {
        document.getElementById('new-team-form').style.display = 'none';
        document.getElementById('payment-section').style.display = 'block';
        
        // Update payment summary
        const paymentSection = document.getElementById('payment-section');
        let summaryHTML = `
            <h2>💳 Complete Your Registration</h2>
            <div class="payment-summary">
                <h3>Registration Summary</h3>
                <div class="summary-details">
                    <p><strong>Player:</strong> ${playerData.name}</p>
                    <p><strong>Email:</strong> ${playerData.email}</p>
                    <p><strong>Team:</strong> ${playerData.teamName}</p>
                    ${playerData.isTeamCaptain ? '<p><strong>Role:</strong> Team Captain</p>' : ''}
                    <p><strong>Add-ons:</strong></p>
                    <ul>
                        ${playerData.addOns.mulligan ? '<li>Mulligan Bag: $10</li>' : ''}
                        ${playerData.addOns.puttingString ? '<li>12" Putting String: $5</li>' : ''}
                        ${!playerData.addOns.mulligan && !playerData.addOns.puttingString ? '<li>None</li>' : ''}
                    </ul>
                    <p class="total-cost"><strong>Total: $${playerData.total}</strong></p>
                </div>
            </div>
            <div class="payment-demo">
                <h3>Demo Payment Mode</h3>
                <p>This is a demonstration. No actual payment will be processed.</p>
                <button id="submit-payment" class="btn btn-primary btn-large">
                    ✅ Complete Registration (Demo)
                </button>
            </div>
            <button onclick="tournamentManager.goBackToForm()" class="btn btn-outline">← Back to Registration Form</button>
            <div id="payment-messages" class="message-container"></div>
        `;
        
        paymentSection.innerHTML = summaryHTML;
        
        // Re-attach event listener
        document.getElementById('submit-payment').addEventListener('click', () => {
            this.completeRegistration();
        });
    }
    
    goBackToForm() {
        document.getElementById('payment-section').style.display = 'none';
        document.getElementById('new-team-form').style.display = 'block';
    }
    
    completeRegistration() {
        const playerData = JSON.parse(sessionStorage.getItem('pendingPlayerRegistration'));
        if (!playerData) {
            alert('Registration data not found. Please try again.');
            return;
        }
        
        // Find or create team
        let team = this.registeredTeams.find(t => 
            t.name.toLowerCase() === playerData.teamName.toLowerCase()
        );
        
        if (!team) {
            team = {
                id: 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: playerData.teamName,
                captain: playerData.isTeamCaptain ? playerData.name : '',
                captainEmail: playerData.isTeamCaptain ? playerData.email : '',
                players: [],
                registrationDate: new Date().toISOString(),
                paymentStatus: 'completed'
            };
            this.registeredTeams.push(team);
        }
        
        // Add player to team
        const playerExists = team.players.find(p => p.email === playerData.email);
        if (!playerExists && team.players.length < 4) {
            team.players.push({
                name: playerData.name,
                email: playerData.email,
                phone: playerData.phone,
                isTeamCaptain: playerData.isTeamCaptain,
                addOns: playerData.addOns,
                total: playerData.total,
                registrationTime: playerData.registrationTime
            });
            
            // Update captain info if this is the captain
            if (playerData.isTeamCaptain) {
                team.captain = playerData.name;
                team.captainEmail = playerData.email;
            }
        }
        
        // Save team data
        localStorage.setItem('registeredTeams', JSON.stringify(this.registeredTeams));
        
        // Clear pending registration
        sessionStorage.removeItem('pendingPlayerRegistration');
        
        // Trigger player registration event for Starting Tee manager
        window.dispatchEvent(new CustomEvent('playerRegistered', {
            detail: playerData
        }));
        
        // Check if team is complete and trigger team complete event
        if (team.players.length === 4) {
            window.dispatchEvent(new CustomEvent('teamComplete', {
                detail: { team: team }
            }));
        }
        
        // Show success message
        this.showRegistrationSuccess(playerData, team);
    }
    
    showRegistrationSuccess(playerData, team) {
        const paymentSection = document.getElementById('payment-section');
        paymentSection.innerHTML = `
            <div class="registration-success">
                <h2>🎉 Registration Complete!</h2>
                <div class="success-details">
                    <p><strong>${playerData.name} has been successfully registered!</strong></p>
                    <p>Team: ${team.name}</p>
                    <p>Players: ${team.players.length}/4</p>
                    <p>Total Paid: $${playerData.total}</p>
                    <p>Confirmation sent to: ${playerData.email}</p>
                    ${team.players.length === 4 ?
                        '<p class="auto-assignment-notice">🏌️ Your team is complete! Check the Starting Tee page for your hole assignment.</p>' :
                        `<p class="team-incomplete">⚠️ Your team has ${team.players.length}/4 players. When you reach 4 players, you'll automatically be assigned a starting hole.</p>`
                    }
                </div>
                <div class="next-steps">
                    <h3>Next Steps:</h3>
                    <ul>
                        <li>Check your email for confirmation details</li>
                        <li>Visit the <a href="starting-tee.html">Starting Tee page</a> to see assignments</li>
                        <li>Use the <a href="scoreboard.html">Scoreboard</a> during the tournament</li>
                    </ul>
                </div>
                <div class="success-actions">
                    <a href="starting-tee.html" class="btn btn-primary">View Starting Tee</a>
                    <a href="index.html" class="btn btn-secondary">Back to Home</a>
                    <button onclick="tournamentManager.registerAnother()" class="btn btn-outline">Register Another Player</button>
                </div>
            </div>
        `;
    }
    
    registerAnother() {
        location.reload();
    }
    
    // Scoreboard Functions
    initializeScoreboard() {
        // Scoreboard initialization is handled by scoreboard.js
        console.log('Scoreboard page initialized');
    }
    
    // Starting Tee Functions
    initializeStartingTee() {
        // Starting Tee initialization is handled by starting-tee.js
        console.log('Starting Tee page initialized');
    }
    
    // Sponsor Functions
    emailSponsors(packageType) {
        const subject = encodeURIComponent(`Cauldron Cup 2025 - ${packageType} Inquiry`);
        const body = encodeURIComponent(`Hello,

I am interested in learning more about the ${packageType} for the Cauldron Cup 2025 golf tournament.
