import { DataCommsEngine } from '../DataCommsEngine.js';
import { VarResponse, VarStatusCodes, systemVariable } from '../DataModels/Types.js';
import { Actions } from '../DataModels/Types.js';
export class fakeDataEngine extends DataCommsEngine {
    constructor(name, options = { poll: false }) {
        super(name);
        this.var_types = new Map();
        this.options = options;
    }
    async Initialize() {
        if (this.options && this.options.poll === true)
            setInterval(this._updateVariables.bind(this), 4000);
        return { success: true };
    }
    _updateVariables() {
        let resp = [];
        let var_list = [];
        this.var_types.forEach((val, key) => {
            if (val === "number") {
                let upd = Math.floor(Math.random() * 100);
                resp.push(new VarResponse(true, key, "default", upd));
                let x = Math.floor(Math.random() * 100);
                if (x > 50) {
                    let v = new systemVariable({ name: key, system: "default" });
                    let y = Math.floor(Math.random() * 100);
                    if (y < 25)
                        v.status = VarStatusCodes.Subscribed;
                    if (y > 25 && y < 50)
                        v.status = VarStatusCodes.Error;
                    if (y > 50 && y < 75)
                        v.status = VarStatusCodes.Pending;
                    if (y > 75)
                        v.status = VarStatusCodes.Warning;
                    var_list.push(v);
                }
            }
        });
        if (resp.length !== 0)
            this.UpdateVars(resp, VarStatusCodes.Subscribed, Actions.Read);
        if (var_list.length !== 0)
            this.manager.Update(var_list);
    }
    async Subscribe(variables) {
        let resp = [];
        variables.forEach(v => {
            let el = document.querySelector(`[name="${v.name}"]`);
            if (typeof v.name !== "string" || v.name === "" || el === null) {
                resp.push(new VarResponse(false, v.name, v.system));
                return;
            }
            // remember last value
            /*if(this.manager.dataTree.GetVar(v).value !== null){
                resp.push(new VarResponse(true, v.name, v.system));
                return;
            }*/
            let val = 0;
            if (el.tagName.toLowerCase().includes("bool")) {
                val = (Math.random() > 0.5) ? true : false;
                this.var_types.set(v.name, "bool");
            }
            else {
                val = Math.floor(Math.random() * 100);
                this.var_types.set(v.name, "number");
            }
            resp.push(new VarResponse(true, v.name, v.system, val));
        });
        return resp;
    }
    async Unsubscribe(variables) {
        return variables.map(v => new VarResponse(true, v.name, v.system));
    }
    async Write(targets, values) {
        let resp = [];
        for (let i = 0; i < targets.length; i++) {
            resp.push(new VarResponse(true, targets[i].name, targets[i].system, values[i]));
        }
        return resp;
    }
    async Read(targets) {
        throw new Error("Method not implemented.");
    }
}
