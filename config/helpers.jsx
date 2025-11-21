import _ from "underscore"

export const arrayMonths=[
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei", 
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember"
]
export const sheetColumn=(col)=>{
    let n=col-1

    var ordA='a'.charCodeAt(0)
    var ordZ='z'.charCodeAt(0)
    var len=ordZ-ordA+1
  
    var s=""
    while(n>=0){
        s=String.fromCharCode(n%len+ordA)+s
        n=Math.floor(n/len)-1
    }
    return s.toUpperCase();
}
export const download=(content, fileName, contentType)=>{
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

/* CENTEROID */
const area=(poly)=>{
    var s = 0.0;
    var ring = poly.coordinates[0];
    for(i= 0; i < (ring.length-1); i++){
        s += (ring[i][0] * ring[i+1][1] - ring[i+1][0] * ring[i][1]);
    }
    return 0.5 *s;
}

export const centroid=(poly)=>{
    var c = [0,0];
    var ring = poly.coordinates[0];
    for(i= 0; i < (ring.length-1); i++){
        c[0] += (ring[i][0] + ring[i+1][0]) * (ring[i][0]*ring[i+1][1] - ring[i+1][0]*ring[i][1]);
        c[1] += (ring[i][1] + ring[i+1][1]) * (ring[i][0]*ring[i+1][1] - ring[i+1][0]*ring[i][1]);
    }
    var a = area(poly);
    c[0] /= a *6;
    c[1] /= a*6;
    return c;
}
export const paginate=(array, page_size, page_number)=>{
    return array.slice((page_number - 1) * page_size, page_number * page_size);
}

export const ceil=num=>{
    if(num=="") return ""
    else return Math.ceil(num)
}

export const explode_ch_generated=(generated)=>{
    const exp=generated.toString().split("|")

    //ex=2023|10|1|85
    return {
        curah_hujan:Number(exp[3]),
        tahun:Number(exp[0]),
        bulan:Number(exp[1]),
        input_ke:Number(exp[2])
    }
}
export const explode_ch_normal_generated=(generated)=>{
    const exp=generated.toString().split("|")

    //ex=10|1|85
    return {
        curah_hujan_normal:Number(exp[2]),
        bulan:Number(exp[0]),
        input_ke:Number(exp[1])
    }
}

export const month_selected=(bulan)=>{
    if(bulan.toString().trim()=="") return {bulan:"", input_ke:""}
    else{
        const new_bulan=bulan.toString().split("_")
        return {bulan:new_bulan[0], input_ke:new_bulan[1]}
    }
}

export const ch_from_properties=(prop_json, tahun, bulan_parsed)=>{
    let ch=""

    const curah_hujan=JSON.parse(prop_json.curah_hujan)
    const input_ke=tahun+"|"+bulan_parsed.bulan+"|"+bulan_parsed.input_ke+"|"
    const input=curah_hujan.filter(ch=>ch.indexOf(input_ke)==0)

    if(input.length>0){
        const input_extracted=explode_ch_generated(input[0])
        ch=numFix(input_extracted.curah_hujan)
    }

    return ch
}
export const ch_normal_from_properties=(prop_json, bulan_parsed)=>{
    let ch=""

    const curah_hujan=JSON.parse(prop_json.curah_hujan_normal)
    const input_ke=bulan_parsed.bulan+"|"+bulan_parsed.input_ke+"|"
    const input=curah_hujan.filter(ch=>ch.indexOf(input_ke)==0)

    if(input.length>0){
        const input_extracted=explode_ch_normal_generated(input[0])
        ch=numFix(input_extracted.curah_hujan_normal)
    }

    return ch
}

export const numFix=(number)=>{
    if(_.isNumber(number)){
        return number.toFixed(2)
    }
    if(_.isEmpty(number)){
        return ""
    }
    let num=Number(number)
    
    if(_.isNaN(num)){
        return ""
    }

    return num.toFixed(2)
}