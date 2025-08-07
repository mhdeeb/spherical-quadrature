import lilGui from "./lil-gui.js";

let recording = false;

const c1_string = "-.05*(x+y)-10.*t";
const c2_string = "1";
const c3_string = "1";
const a_string = "1";

const color_type = ["rgb", "hsv", "solid"];
const export_ext = ["png", "webp", "jpg", "gif", "json"];
const color_number = 2;

function reset_advanced() {
    settings.points = base_points;
    settings.interpolate_points = true;
    settings.interpolate_multiplier = 1.5;
}

function reset() {
    settings.animate = false;
    settings.time = settings.t_max;
    settings.speed_multiplier = 1;
}

function reset_camera() {
    controls.reset();
}

function export_func() {
    if (settings.export_ext === export_ext[0]) {
        renderer.domElement.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.setAttribute("download", `art_${new Date().toISOString()}.png`);
            a.setAttribute("href", url);
            a.click();
            URL.revokeObjectURL(url);
        });
    } else if (settings.export_ext === export_ext[1]) {
        renderer.domElement.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.setAttribute("download", `art_${new Date().toISOString()}.webp`);
            a.setAttribute("href", url);
            a.click();
            URL.revokeObjectURL(url);
        }, "image/webp");
    } else if (settings.export_ext === export_ext[2]) {
        renderer.domElement.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.setAttribute("download", `art_${new Date().toISOString()}.jpg`);
            a.setAttribute("href", url);
            a.click();
            URL.revokeObjectURL(url);
        }, "image/jpeg");
    } else if (settings.export_ext === export_ext[3]) {
        renderer.domElement.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.setAttribute("download", `art_${new Date().toISOString()}.gif`);
            a.setAttribute("href", url);
            a.click();
            URL.revokeObjectURL(url);
        }, "image/gif");
    } else if (settings.export_ext === export_ext[4]) {
        const json = gui.save();
        const blob = new Blob([JSON.stringify(json)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.setAttribute("download", `art_${new Date().toISOString()}.json`);
        a.setAttribute("href", url);
        a.click();
        URL.revokeObjectURL(url);
    }
}

function record_func() {
    if (recording) {
        record_button.name("Record");
        export_button.enable();
        load_button.enable();
        recorder.stop();
    } else {
        record_button.name("Stop Recording");
        export_button.disable();
        load_button.disable();
        recorder.start();
    }

    recording = !recording;
}

function load_graph() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const json = JSON.parse(e.target.result);
            gui.load(json);
        };
        reader.readAsText(file);
    };
    input.click();
}

const settings = {
    p: 1,
    t_min: 0,
    t_max: 60,
    normalize_parameters: true,
    color_type: color_type[color_number],
    c1: c1_string,
    c2: c2_string,
    c3: c3_string,
    a: a_string,
    solid_color: "#ffffff",
    points: 2000,
    background: "#000000",
    background_opacity: 1,
    interpolate_points: true,
    interpolate_multiplier: 1.5,
    reset_advanced,
    animate: true,
    time: t_limit,
    speed_multiplier: 1,
    reset,
    reset_camera,
    export_ext: export_ext[0],
    export: export_func,
    record: record_func,
    load_graph,
};

const gui = new lilGui();
gui.add(settings, "load_graph").name("Load JSON");
gui.close();

const p1 = gui.addFolder("Parametric 1");
const parameters = p1.addFolder("Parameters (WIP)");
parameters
    .add(settings, "p", 0, 1, 0.001)
    .name("P")
    .onChange(() => { });
const time_min = parameters
    .add(settings, "t_min")
    .name("Min Time")
    .onChange((value) => {
        if (value > settings.t_max) {
            settings.t_max = value;
            time.max(value);
            time_max.updateDisplay();
        }
    })
    .onFinishChange((value) => {
        time.min(value);
        materialLine.uniforms.min_time.value = value;
        materialCircle.uniforms.min_time.value = value;
    });
const time_max = parameters
    .add(settings, "t_max")
    .name("Max Time")
    .onChange((value) => {
        if (value < settings.t_min) {
            settings.t_min = value;
            time.min(value);
            time_min.updateDisplay();
        }
    })
    .onFinishChange((value) => {
        time.max(value);
        materialLine.uniforms.min_time.value = value;
        materialCircle.uniforms.min_time.value = value;
    });
parameters.close();

const color = p1.addFolder("Color");
color
    .add(settings, "normalize_parameters")
    .name("Normalize Parameters")
    .onChange(() => {
        materialLine.uniforms.normalize_parameters.value =
            settings.normalize_parameters;
        materialCircle.uniforms.normalize_parameters.value =
            settings.normalize_parameters;
    });
color
    .add(settings, "color_type", color_type)
    .name("Color Type")
    .onChange((value) => {
        if (value === color_type[0]) {
            c1.name("R(x, y, z, t)");
            c2.name("G(x, y, z, t)");
            c3.name("B(x, y, z, t)");
            c1.show();
            c2.show();
            c3.show();
            solid_color.hide();
            materialCircle.uniforms.type.value = 0;
            materialLine.uniforms.type.value = 0;
        } else if (value === color_type[1]) {
            c1.name("H(x, y, z, t)");
            c2.name("S(x, y, z, t)");
            c3.name("V(x, y, z, t)");
            c1.show();
            c2.show();
            c3.show();
            solid_color.hide();
            materialCircle.uniforms.type.value = 1;
            materialLine.uniforms.type.value = 1;
        } else {
            c1.hide();
            c2.hide();
            c3.hide();
            solid_color.show();
            materialCircle.uniforms.type.value = 2;
            materialLine.uniforms.type.value = 2;
        }
    });
const c1 = color
    .add(settings, "c1")
    .name("H(x, y, z, t)")
    .listen()
    .onFinishChange((value) => {
        c1_string = value;
        materialCircle.fragmentShader = frag(
            c1_string,
            c2_string,
            c3_string,
            a_string
        );
        materialCircle.needsUpdate = true;
        materialLine.fragmentShader = frag(
            c1_string,
            c2_string,
            c3_string,
            a_string
        );
        materialLine.needsUpdate = true;
    });
const c2 = color
    .add(settings, "c2")
    .name("S(x, y, z, t)")
    .listen()
    .onFinishChange((value) => {
        c2_string = value;
        materialCircle.fragmentShader = frag(
            c1_string,
            c2_string,
            c3_string,
            a_string
        );
        materialCircle.needsUpdate = true;
        materialLine.fragmentShader = frag(
            c1_string,
            c2_string,
            c3_string,
            a_string
        );
        materialLine.needsUpdate = true;
    });
const c3 = color
    .add(settings, "c3")
    .name("V(x, y, z, t)")
    .listen()
    .onFinishChange((value) => {
        c3_string = value;
        materialCircle.fragmentShader = frag(
            c1_string,
            c2_string,
            c3_string,
            a_string
        );
        materialCircle.needsUpdate = true;
        materialLine.fragmentShader = frag(
            c1_string,
            c2_string,
            c3_string,
            a_string
        );
        materialLine.needsUpdate = true;
    });
const solid_color = color
    .addColor(settings, "solid_color")
    .name("Color")
    .hide()
    .onChange((value) => {
        materialCircle.uniforms.solid_color.value = new THREE.Color(value);
        materialLine.uniforms.solid_color.value = new THREE.Color(value);
    });
color
    .add(settings, "a")
    .name("A(x, y, z, t)")
    .onFinishChange((value) => {
        a_string = value;
        materialCircle.fragmentShader = frag(
            c1_string,
            c2_string,
            c3_string,
            a_string
        );
        materialCircle.needsUpdate = true;
        materialLine.fragmentShader = frag(
            c1_string,
            c2_string,
            c3_string,
            a_string
        );
        materialLine.needsUpdate = true;
    });
color.close();

const animation = p1.addFolder("Animation");
animation.add(settings, "animate").name("Animate").listen();
animation
    .add(settings, "speed_multiplier", 0, 10, 0.01)
    .name("Speed Multiplier")
    .listen();
animation
    .add(settings, "time", settings.t_min, settings.t_max, 0.01)
    .name("Time")
    .listen()
    .onChange((value) => {
        materialCircle.uniforms.time.value = value;
        materialLine.uniforms.time.value = value;
    });
animation.add(settings, "reset").name("Reset");
animation.open();

const general = gui.addFolder("General");
general.add(settings, "reset_camera").name("Reset Camera");
general
    .addColor(settings, "background")
    .name("Background")
    .listen()
    .onChange(() => {
        renderer.setClearColor(settings.background, settings.background_opacity);
    });
general
    .add(settings, "background_opacity", 0, 1, 0.01)
    .name("Background Opacity")
    .onChange((value) => {
        renderer.setClearColor(settings.background, value);
    });

const exp = gui.addFolder("Export");
exp.add(settings, "export_ext", export_ext).name("Extension");
exp.add(settings, "export").name("Export");
exp.close();

const record = exp.addFolder("Record");
record.add(settings, "record").name("Record");
record.close();

window.addEventListener("keydown", function (event) {
    switch (event.code) {
        case "KeyT":
            break;
    }
});
