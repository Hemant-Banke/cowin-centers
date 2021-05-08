
var Error = (() => {
    let toast = document.getElementById('err-toast');
    let toast_msg = document.getElementById('err-msg');

    let bs_toast = new bootstrap.Toast(toast);

    return {
        show : (err_msg) => {
            toast_msg.innerText = err_msg;
            bs_toast.show();
        }
    }
})();


var serve = 'https://cdn-api.co-vin.in/api';
var CoWin = (() => {
    let info_body = document.getElementById('info_body');
    let info_len = document.getElementById('info_len');

    return {
        getCenters : async (district_id, vaccine = 'any', pincode = '0', min_age = 0, center_name = '') => {
            let res_capacity = 0;
            let date = new Date();
            date = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

            try{
                let res = await fetch(serve + `/v2/appointment/sessions/public/calendarByDistrict?district_id=${district_id}&date=${date}`);
                res = await res.json();

                let centers = res.centers;
                let res_len = 0;

                info_body.innerHTML = '';

                centers.forEach(center => {

                    if (pincode && pincode != '0' && pincode != center.pincode){
                        return;
                    }

                    if (center_name && center_name != 'any' && !center.name.toLowerCase().includes(center_name.toLowerCase())){
                        return;
                    }

                    center.sessions.forEach(session => {
                        if (vaccine && vaccine != 'any' && vaccine.toLowerCase() != session.vaccine.toLowerCase()){
                            return;
                        }

                        if (min_age && min_age != session.min_age_limit){
                            return;
                        }

                        let row = document.createElement('tr');
                        row.innerHTML = `
                            <td><b>${center.name}</b><br>${center.address}, ${center.block_name}<br>${center.pincode} <b>(${center.lat}, ${center.long})</b></td>
                            <td>${(session.available_capacity > 0) ?
                                `<span class="badge bg-success">${session.available_capacity}</span>` :
                                `<span class="badge bg-danger">${session.available_capacity}</span>`}</td>
                            <td>${session.vaccine}</td>
                            <td>${center.fee_type}</td>
                            <td>${session.date}<br><small>${center.from}<br>${center.to}</small></td>
                            <td>${session.min_age_limit}</td>
                        `;

                        info_body.appendChild(row);
                        res_len += 1;
                        res_capacity += session.available_capacity;
                    });
                });

                info_len.innerText = res_len + ' Centers Found!';
                if (res_len == 0){
                    info_body.innerHTML = `<tr>No Centers Found 😔</tr>`;
                }
            }
            catch(err){
                Error.show(err);
            }

            return res_capacity;
        }
    }
})();



var Filter = (() => {
    let btn_resp = document.getElementById('btn-getresp');
    let btn_check_start = document.getElementById('btn-check-start');
    let btn_check_stop = document.getElementById('btn-check-stop');

    let spinner = btn_resp.querySelector('.spinner-border');

    let state = document.getElementById('state');
    let district = document.getElementById('district');
    let pincode = document.getElementById('pincode');
    let vaccine = document.getElementById('vaccine');
    let age = document.getElementById('age');
    let center = document.getElementById('center');

    let checkInterval = null;
    let intervalTime = 60;          // 60 sec interval
    btn_check_start.innerText = `Check every ${intervalTime}s`;

    btn_resp.addEventListener('click', async () => {
        if (!Filter.check()){
            return;
        }

        spinner.style.display = 'inline-block';
        await CoWin.getCenters(district.value, vaccine.value, pincode.value, parseInt(age.value), center.value);
        spinner.style.display = 'none';
    });


    function getStates(){
        fetch(serve + `/v2/admin/location/states`)
        .then(res => res.json())
        .then(res => {
            let states = res.states;
            states.forEach(state_i => {
                let op = document.createElement('option');
                op.setAttribute('value', state_i.state_id);
                op.innerText = state_i.state_name;

                state.appendChild(op);
            });
        })
        .catch(msg => {
            Error.show(msg);
        });
    }
    getStates();


    function getDistricts(){
        fetch(serve + `/v2/admin/location/districts/${state.value}`)
        .then(res => res.json())
        .then(res => {
            let districts = res.districts;
            district.innerHTML = '<option value="" selected>Select your district</option>';

            districts.forEach(district_i => {
                let op = document.createElement('option');
                op.setAttribute('value', district_i.district_id);
                op.innerText = district_i.district_name;

                district.appendChild(op);
            });
        })
        .catch(msg => {
            Error.show(msg);
        });
    }
    state.addEventListener('change', getDistricts);


    btn_check_start.addEventListener('click', () => {
        Filter.checkStart();
    });
    btn_check_stop.addEventListener('click', () => {
        Filter.checkStop();
    });


    return {
        check : () => {
            let is_valid = true;
            pincode.value = pincode.value.trim();
            center.value = center.value.trim();

            if (!district.value){
                Error.show('Select a district');
                is_valid = false;
            }

            if (!['COVISHIELD', 'COVAXIN', 'any'].includes(vaccine.value)){
                Error.show('Select vaccine type');
                is_valid = false;
            }

            if (![0, 18, 45].includes(parseInt(age.value))){
                Error.show('Select minimum age limit');
                is_valid = false;
            }
            return is_valid;
        },

        runInterval : async () => {
            let res_capacity = await CoWin.getCenters(district.value, vaccine.value, pincode.value, parseInt(age.value), center.value);

            if (res_capacity > 0){
                // Play a sound
                let audio = new Audio("./assets/beep.wav");
                audio.play();
            }
        },

        checkStart : () => {
            if (checkInterval){
                Error.show('Stop the previous Timer');
                return;
            }
            if (!Filter.check()){
                return;
            }

            Filter.runInterval();
            checkInterval = setInterval(() => {
                Filter.runInterval();
            }, 1000*intervalTime);

            btn_check_start.style.display = 'none';
            btn_check_stop.style.display = 'inline-block';
        },

        checkStop : () => {
            if (!checkInterval){
                Error.show('Start a Timer');
                return;
            }
            clearInterval(checkInterval);
            checkInterval = null;

            btn_check_stop.style.display = 'none';
            btn_check_start.style.display = 'inline-block';
        }
    }

})();