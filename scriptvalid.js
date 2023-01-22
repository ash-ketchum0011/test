var namee = document.forms['form']['namee'];
var dob = document.forms['form']['dob'];
var gender = document.forms['form']['gender'];
var address = document.forms['form']['address'];
var contact = document.forms['form']['contact'];
var blood = document.forms['form']['blood'];

var namee_error = document.getElementById('namee_error');
var dob_error = document.getElementById('dob_error');
var gender_error = document.getElementById('gender_error');
var address_error = document.getElementById('address_error');
var contact_error = document.getElementById('contact_error');
var blood_error = document.getElementById('blood_error');

namee.addEventListener('textInput', namee_Verify);
dob.addEventListener('change', dob_Verify);
gender.addEventListener('change', gender_Verify);
address.addEventListener('textInput', address_Verify);
contact.addEventListener('textInput', contact_Verify);
blood.addEventListener('change', blood_Verify);

function validated() {
    if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        address_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        address_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    } 
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        address_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    } 
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        address_error.style.display = "block";
        return false;
    } 
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    } 
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    } 
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    } 
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        address_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        address_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        address_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        address_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        dob_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        gender_error.style.display = "block";
        address_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        gender_error.style.display = "block";
        address_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        gender_error.style.display = "block";
        address_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        gender_error.style.display = "block";
        address_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        gender_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        gender_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        gender_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        gender_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        address_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        address_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        address_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        address_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length == 0) {
        namee_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length == 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length != 0) {
        namee_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length == 0) {
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        address_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length != 0) {
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        address_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length == 0) {
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        address_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length != 0) {
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        address_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length == 0) {
        
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length != 0) {
        
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length == 0) {
        
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length != 0) {
        
        dob_error.style.display = "block";
        gender_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length == 0) {
        
        dob_error.style.display = "block";
        address_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length != 0) {
        
        dob_error.style.display = "block";
        address_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length == 0) {
        
        dob_error.style.display = "block";
        address_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length != 0) {
        
        dob_error.style.display = "block";
        address_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length == 0) {
        
        dob_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length != 0) {
        
        dob_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length == 0) {
        
        dob_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length == 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length != 0) {
       
        dob_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length == 0) {
        
        gender_error.style.display = "block";
        address_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length != 0) {
        
        gender_error.style.display = "block";
        address_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length == 0) {
        
        gender_error.style.display = "block";
        address_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length != 0) {
       
        gender_error.style.display = "block";
        address_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length == 0) {
        
        gender_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length != 0) {
        
        gender_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length == 0) {
        
        gender_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length == 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length != 0) {
        
        gender_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length == 0) {
        
        address_error.style.display = "block";
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length == 0 && blood.value.length != 0) {
       
        address_error.style.display = "block";
        contact_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length == 0) {
        
        address_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length == 0 && contact.value.length != 0 && blood.value.length != 0) {
        
        address_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length == 0) {
        
        contact_error.style.display = "block";
        blood_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length == 0 && blood.value.length != 0) {
        
        contact_error.style.display = "block";
        return false;
    }
    else if (namee.value.length != 0 && dob.value.length != 0 && gender.value.length != 0 && address.value.length != 0 && contact.value.length != 0 && blood.value.length == 0) {
        blood_error.style.display = "block";
        return false;
    }
}

function namee_Verify() {
    if (namee.value.length != 0) {
        namee_error.style.display = "none";
        return true;
    }
}
function dob_Verify() {
    if (dob.value.length != 0) {
        dob_error.style.display = "none";
        return true;
    }
}
function contact_Verify() {
    if (contact.value.length != 0) {
        contact_error.style.display = "none";
        return true;
    }
}
function gender_Verify() {
    if (gender.value.length != 0) {
        gender_error.style.display = "none";
        return true;
    }
}
function address_Verify() {
    if (address.value.length != 0) {
        address_error.style.display = "none";
        return true;
    }
}
function blood_Verify() {
    if (blood.value.length != 0) {
        blood_error.style.display = "none";
        return true;
    }
}