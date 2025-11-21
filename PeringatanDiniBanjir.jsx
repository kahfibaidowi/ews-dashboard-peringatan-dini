import { Layout } from "@/Components/layout"
import update from "immutability-helper"
import { api, api_express } from "@/Config/api"
import _ from "underscore"
import axios from "axios"
import React from "react"
import L, { latLng, vectorGrid } from "leaflet"
import "leaflet.vectorgrid"
import MapWindy from "@/Components/Modules/map_windy_banjir"
import { BASE_URL, BASE_URL_XP, isUndefined } from "@/Config/config"
import { Head } from "@inertiajs/react"
import { toast, ToastContainer } from "react-toastify"
import { FiBarChart2, FiChevronDown, FiCloudRain, FiFilter, FiHome, FiMenu, FiWind } from "react-icons/fi"
import * as turf from '@turf/turf'
import { ceil, centroid, ch_from_properties, ch_normal_from_properties, explode_ch_generated, explode_ch_normal_generated, month_selected, numFix } from "@/Config/helpers"
import { Collapse, Modal, Offcanvas } from "react-bootstrap"
import classNames from "classnames"
import MenuSidebar from "@/Components/menu_sidebar"
import { ToastApp } from "@/Components/toast"
import { SyncLoader } from "react-spinners"
import { Highlighter, Typeahead } from "react-bootstrap-typeahead"
import Select from "react-select"
import haversine from "haversine-distance"
import CreatableSelect from "react-select/creatable"



class Frontpage extends React.Component{
    state={
        tahun:"",
        bulan:"",
        provinsi_form:[],
        summary_ews_produksi:{
            bawang_merah:0,
            cabai_besar:0,
            cabai_rawit:0
        },
        map:null,
        search_data:[],
        geo_json_label:null,
        loaded:false,
        show_menu:false,
        collapse:"peringatan_dini",
        mobile_show:false,
        is_loading:false,
        detail:{
            is_open:false,
            data:{}
        }
    }

    request={
        apiGetKecamatan:async(tahun)=>{
            return await api_express().get("/kecamatan")
            .then(res=>res.data)
        }
    }
    //--data
    fetchKecamatan=async()=>{
        await this.request.apiGetKecamatan()
        .then(data=>{
            this.setState({
                search_data:data.data
            })
        })
        .catch(err=>{
            toast.error("Gets Data Failed!", {position:"bottom-center"})
        })
    }
    

    componentDidMount=()=>{
        //date
        const tahun=(new Date()).getFullYear()

        //map
        const myMap=L.map('mapid', {
            center:[-1.973, 116.253],
            zoom: 5,
            zoomControl:false
        })
        L.control.zoom({
            position:"topright"
        }).addTo(myMap)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(myMap)

        //state
        this.setState({
            tahun:tahun,
            map:myMap
        }, ()=>{
            this.fetchKecamatan()
            this.renderJSONVT()
        })
    }
    renderJSONVT=()=>{
        //options
        const {map, tahun, bulan}=this.state

        //map
        if(map!=null){
            map.remove()
        }

        const myMap=L.map('mapid', {
            center:[-1.973, 116.253],
            zoom: 5,
            zoomControl:false,
            maxZoom:16
        })
        L.control.zoom({
            position:"topright"
        }).addTo(myMap)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(myMap)

        //vector grid
        L.vectorGrid.protobuf(BASE_URL_XP+"/kecamatan/{z}/{x}/{y}", {
            rendererFactory: L.canvas.tile,
            interactive: true,
            vectorTileLayerStyles:{
                kecamatan:(properties, zoom)=>{
                    const ch=this.parseCH(tahun, bulan, properties)
                    
                    let color=this.blockColor(ch.curah_hujan)

                    let zoom_opacity=0
                    if(zoom>=10) zoom_opacity=0.8

                    return {
                        fill:true,
                        fillColor:color,
                        color:"#fff",
                        weight:1,
                        opacity:zoom_opacity,
                        fillOpacity:0.8,
                    }
                }
            },
            getFeatureId:f=>{
                return f.properties['id_region']
            }
        })
        .on("click", e=>{
            const prop=e.layer.properties
            const ch=this.parseCH(tahun, bulan, prop)

            const data={
                id_region:prop.id_region,
                region:prop.region,
                kabupaten_kota:prop.kabupaten_kota,
                provinsi:prop.provinsi,
                curah_hujan:ch.curah_hujan,
                curah_hujan_normal:ch.curah_hujan_normal
            }
            this.toggleDetail(true, data)
        })
        .addTo(myMap)

        //state
        this.setState({
            map:myMap
        }, ()=>{
            //label region
            myMap.on("dragend", e=>{
                this.renderLabel(myMap.getCenter(), myMap.getZoom())
            })
            myMap.on("zoomend", e=>{
                this.renderLabel(myMap.getCenter(), myMap.getZoom())
            })
        })
    }
    renderLabel=(latlng, zoom)=>{
        const {geo_json_label, map, search_data}=this.state
        
        if(zoom>=11){
            if(geo_json_label!=null){
                map.removeLayer(geo_json_label)
            }

            const data_geo_json=search_data.filter(f=>{
                let coord={lat:f.map_center.latitude, lng:f.map_center.longitude}
                
                if(haversine(latlng, coord)<60000) return true
                return false
            })

            let layer_group=[]
            for(var i=0; i<data_geo_json.length; i++){
                const layer=new L.Marker([data_geo_json[i].map_center.latitude, data_geo_json[i].map_center.longitude], {
                    icon: new L.divIcon({
                        className:"marker-icon",
                        html:`
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="24" 
                                    height="24" 
                                    viewBox="0 0 24 24" 
                                    stroke-width="2" 
                                    stroke-linecap="round" 
                                    stroke-linejoin="round" 
                                    class="feather feather-map-pin" 
                                    stroke="#f00" 
                                    fill="#f00"
                                >
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                    <circle 
                                        cx="12" 
                                        cy="10" 
                                        r="3" 
                                        stroke="#fff" 
                                        fill="#fff"
                                    />
                                </svg>
                            `
                    })
                })
                .bindTooltip("<span>"+data_geo_json[i].region+"</span>", {
                    permanent:true,
                    direction:"top",
                    sticky:true,
                    className:"tooltip-marker"
                })
                layer_group=layer_group.concat([layer])
            }
            const label_data=L.layerGroup(layer_group)
            map.addLayer(label_data)

            this.setState({
                geo_json_label:label_data
            })
        }
        else{
            if(geo_json_label!=null){
                map.removeLayer(geo_json_label)
            }
        }
    }
    blockColor=(curah_hujan)=>{
        const value=curah_hujan.toString().trim()!=""?Number(curah_hujan):""

        if(value==""){
            return "#fff"
        }
        
        if(value<=150){
            return "#238c3f"
        }
        else if(value>150 && value<=200){
            return "#8c5f23"
        }
        else if(value>200){
            return "#8c2323"
        }
    }
    

    //VALUES
    month=[
        {label:"Rata-rata per tahun", value:""},
        {label:"Januari 1", value:"1_1"},
        {label:"Januari 2", value:"1_2"},
        {label:"Januari 3", value:"1_3"},
        {label:"Februari 1", value:"2_1"},
        {label:"Februari 2", value:"2_2"},
        {label:"Februari 3", value:"2_3"},
        {label:"Maret 1", value:"3_1"},
        {label:"Maret 2", value:"3_2"},
        {label:"Maret 3", value:"3_3"},
        {label:"April 1", value:"4_1"},
        {label:"April 2", value:"4_2"},
        {label:"April 3", value:"4_3"},
        {label:"Mei 1", value:"5_1"},
        {label:"Mei 2", value:"5_2"},
        {label:"Mei 3", value:"5_3"},
        {label:"Juni 1", value:"6_1"},
        {label:"Juni 2", value:"6_2"},
        {label:"Juni 3", value:"6_3"},
        {label:"Juli 1", value:"7_1"},
        {label:"Juli 2", value:"7_2"},
        {label:"Juli 3", value:"7_3"},
        {label:"Agustus 1", value:"8_1"},
        {label:"Agustus 2", value:"8_2"},
        {label:"Agustus 3", value:"8_3"},
        {label:"September 1", value:"9_1"},
        {label:"September 2", value:"9_2"},
        {label:"September 3", value:"9_3"},
        {label:"Oktober 1", value:"10_1"},
        {label:"Oktober 2", value:"10_2"},
        {label:"Oktober 3", value:"10_3"},
        {label:"November 1", value:"11_1"},
        {label:"November 2", value:"11_2"},
        {label:"November 3", value:"11_3"},
        {label:"Desember 1", value:"12_1"},
        {label:"Desember 2", value:"12_2"},
        {label:"Desember 3", value:"12_3"}
    ]
    tahun_options=()=>{
        const year=(new Date()).getFullYear()

        let years=[]
        for(var i=year-2; i<=year+2; i++){
            years=years.concat([{value:i, label:i}])
        }

        return [{value:"", label:"Pilih Tahun"}].concat(years)
    }
    valueBanjir=(str_value)=>{
        if(_.isUndefined(str_value)) return ""
        
        const value=str_value.toString().trim()!=""?Number(str_value):""
        
        if(value=="") return ""

        if(value<=150){
            return "Aman"
        }
        else if(value>150 && value<=200){
            return "Waspada"
        }
        else if(value>200){
            return "Rawan"
        }
    }
    valueKekeringan=(str_value)=>{
        if(_.isUndefined(str_value)) return ""
        
        const value=str_value.toString().trim()!=""?Number(str_value):""
        
        if(value=="") return ""

        if(value<60){
            return "Rawan"
        }
        else if(value>=60 && value<75){
            return "Waspada"
        }
        else if(value>=75){
            return "Aman"
        }

        return ""
    }
    parseCH=(tahun, bulan, prop)=>{
        if(bulan.toString()==""){
            const curah_hujan=JSON.parse(prop.curah_hujan)
            const curah_hujan_normal=JSON.parse(prop.curah_hujan_normal)

            const new_arr_ch=curah_hujan.filter(f=>f.indexOf(tahun.toString()+"|")==0)

            let ch_generated={
                curah_hujan:"",
                curah_hujan_normal:""
            }
            if(new_arr_ch.length>0){
                let arr_ch=[]
                let ch=0
                
                new_arr_ch.map(c=>{
                    let input_extracted=explode_ch_generated(c)

                    if(arr_ch.filter(f=>(f.bulan==input_extracted.bulan&&f.input_ke==input_extracted.input_ke)).length==0){
                        ch+=input_extracted.curah_hujan

                        arr_ch=arr_ch.concat([input_extracted])
                    }
                })

                ch_generated=Object.assign({}, ch_generated, {
                    curah_hujan:numFix(ch/arr_ch.length)
                })
            }
            if(curah_hujan_normal.length>0){
                let arr_ch=[]
                let ch_normal=0
                
                curah_hujan_normal.map(c=>{
                    let input_extracted=explode_ch_normal_generated(c)

                    if(arr_ch.filter(f=>(f.bulan==input_extracted.bulan&&f.input_ke==input_extracted.input_ke)).length==0){
                        ch_normal+=input_extracted.curah_hujan_normal

                        arr_ch=arr_ch.concat([input_extracted])
                    }
                })

                ch_generated=Object.assign({}, ch_generated, {
                    curah_hujan_normal:numFix(ch_normal/arr_ch.length)
                })
            }

            return ch_generated
        }
        else{
            const bulan_parsed=month_selected(bulan)
            const ch=ch_from_properties(prop, tahun, bulan_parsed)
            const ch_normal=ch_normal_from_properties(prop, bulan_parsed)
            
            return {
                curah_hujan:ch,
                curah_hujan_normal:ch_normal
            }
        }
    }

    //ACTIONS
    typeBulan=e=>{
        this.setState({
            bulan:e.value
        }, ()=>{
            if(this.state.tahun.toString()!=""){
                this.renderJSONVT()
            }
        })
    }
    typeTahun=e=>{
        this.setState({
            tahun:e.value
        }, ()=>{
            if(this.state.tahun.toString()!=""){
                this.renderJSONVT()
            }
        })
    }
    setShowMenu=show=>{
        this.setState({
            show_menu:show
        })
    }
    setCollapse=collapse=>{
        this.setState({
            collapse:collapse
        })
    }
    setMobileShow=(show=false)=>{
        this.setState({mobile_show:show})
    }

    //DETAIL
    toggleDetail=(is_open=false, data={})=>{
        this.setState({
            detail:{
                is_open,
                data
            }
        })
    }
    sifatHujan=(curah_hujan, normal)=>{
        if(_.isUndefined(curah_hujan) || _.isUndefined(normal)){
            return ""
        }
        if(curah_hujan.toString().trim()==""||normal.toString().trim()==""){
            return ""
        }
        if(Number(normal)==0){
            return "?"
        }

        const value=curah_hujan/normal;
        if(value<=0.3){
            return "<div class='d-flex align-items-center'><div class='d-flex mx-1' style='width:25px;height:15px;background:#4a1400'></div> (0 - 30%) Bawah Normal</div>";
        }
        if(value<=0.5){
            return "<div class='d-flex align-items-center'><div class='d-flex mx-1' style='width:25px;height:15px;background:#a65900'></div> (31 - 50%) Bawah Normal</div>";
        }
        if(value<=0.84){
            return "<div class='d-flex align-items-center'><div class='d-flex mx-1' style='width:25px;height:15px;background:#f3c40f'></div> (51 - 84%) Bawah Normal</div>";
        }
        if(value<=1.15){
            return "<div class='d-flex align-items-center'><div class='d-flex mx-1' style='width:25px;height:15px;background:#fefe00'></div> (85 - 115%) Normal</div>";
        }
        if(value<=1.5){
            return "<div class='d-flex align-items-center'><div class='d-flex mx-1' style='width:25px;height:15px;background:#89b700'></div> (116 - 150%) Atas Normal</div>";
        }
        if(value<=2){
            return "<div class='d-flex align-items-center'><div class='d-flex mx-1' style='width:25px;height:15px;background:#238129'></div> (151 - 200%) Atas Normal</div>";
        }
        if(value>2){
            return "<div class='d-flex align-items-center'><div class='d-flex mx-1' style='width:25px;height:15px;background:#00460e'></div> (> 200%) Atas Normal</div>";
        }
    }
    sifatBulan=(curah_hujan)=>{
        if(_.isUndefined(curah_hujan)){
            return ""
        }
        if(curah_hujan.toString().trim()==""){
            return ""
        }

        if(curah_hujan>200){
            return "Bulan Basah"
        }
        else if(curah_hujan>=100 && curah_hujan<=200){
            return "Bulan Lembab"
        }
        else if(curah_hujan>=60 && curah_hujan<100){
            return "Bulan Kering"
        }
        else if(curah_hujan<60){
            return "Bulan Sangat Kering"
        }
    }


    render(){
        const {tahun, bulan, map, search_data, show_menu, collapse, is_loading, detail}=this.state

        return (
            <>
                <Head>
                    <title>Peringatan Dini Banjir</title>
                </Head>

                <nav class="navbar bg-white" style={{left:0, top:0, width:"100%", zIndex:1001, height:"auto", border:"0", position:"relative"}}>
                    <div class="container-fluid" style={{minHeight:"50px"}}>
                        <div className="d-flex align-items-center">
                            <button 
                                class="btn btn-link link-dark p-0 px-1 fs-3" 
                                type="button"
                                onClick={e=>this.setShowMenu(true)}
                            >
                                <FiMenu/>
                            </button>
                            <h4 className="ms-3 mb-0 d-none d-md-inline fs-5 fw-semibold">Peringatan Dini Banjir</h4>
                        </div>
                        <div className="d-flex d-md-none">
                            <button
                                type="button" 
                                className="btn btn-secondary btn-icon"
                                onClick={e=>this.setMobileShow(true)}
                            >
                                <FiFilter/>
                            </button>
                        </div>
                        <div className="d-none d-md-flex">
                            <div class="ms-3" style={{minWidth:"250px"}}>
                                <Typeahead
                                    id="rendering-example"
                                    labelKey="region"
                                    options={search_data}
                                    placeholder="Cari Wilayah ..."
                                    maxResults={10}
                                    onChange={e=>{
                                        if(e.length>0){
                                            if(this.state.map==null) return

                                            this.state.map.setView([e[0].map_center.latitude, e[0].map_center.longitude], e[0].map_center.zoom)
                                        }
                                    }}
                                    renderMenuItemChildren={(option, {text})=>{
                                        return (
                                            <>
                                                <Highlighter search={text} highlightClassName="pe-0">{option.region}</Highlighter>
                                                <div className="text-muted overflow-hidden" style={{textOverflow:"ellipsis"}}>
                                                    <small>
                                                        {option.kabupaten_kota}, {' '}
                                                        {option.provinsi}
                                                    </small>
                                                </div>
                                            </>
                                        )
                                    }}
                                    
                                />
                            </div>
                            <div className="ms-2" style={{minWidth:"120px"}}>
                                <Select
                                    options={this.month}
                                    styles={{
                                        container:(baseStyles, state)=>({
                                            ...baseStyles,
                                            zIndex:99999999999
                                        })
                                    }}
                                    value={this.month.find(f=>f.value==bulan)}
                                    onChange={e=>this.typeBulan(e)}
                                    placeholder="Pilih Bulan"
                                    isSearchable
                                />
                            </div>
                            <div className="ms-2" style={{minWidth:"120px"}}>
                                <CreatableSelect
                                    options={this.tahun_options()}
                                    onChange={e=>this.typeTahun(e)}
                                    value={this.tahun_options().find(f=>f.value==tahun)}
                                    placeholder="Pilih Tahun"
                                    styles={{
                                        container:(baseStyles, state)=>({
                                            ...baseStyles,
                                            zIndex:99999999999
                                        })
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </nav>

                <div style={{width:"100%", height:"calc(100vh - 50px)"}} id="mapid"></div>
                <div
                    style={{
                        padding:"12px",
                        position:"fixed",
                        top:"62px",
                        left:"12px",
                        background:"#fff",
                        zIndex:991
                    }}
                >
                    <div className="d-flex flex-column">
                        <h4 style={{fontWeight:"600", fontSize:"0.875rem"}}>KETERANGAN</h4>
                        <table class='mt-3'>
                            <tr>
                                <td><div class='d-flex'><div class='d-flex me-1' style={{width:"25px", height:"15px", background:"#238c3f"}}></div></div></td>
                                <th> <span class='ms-2'>Aman</span></th>
                            </tr>
                            <tr style={{borderTop:"1px solid #9a9a9a"}}>
                                <td class='pt-1'><div class='d-flex'><div class='d-flex me-1' style={{width:"25px", height:"15px", background:"#8c5f23"}}></div></div></td>
                                <th> <span class='ms-2'>Waspada</span></th>
                            </tr>
                            <tr style={{borderTop:"1px solid #9a9a9a"}}>
                                <td class='pt-1'><div class='d-flex'><div class='d-flex me-1' style={{width:"25px", height:"15px", background:"#8c2323"}}></div></div></td>
                                <th> <span class='ms-2'>Rawan</span></th>
                            </tr>
                        </table>
                    </div>
                </div>

                {/* FILTER MOBILE */}
                <Offcanvas show={this.state.mobile_show} onHide={()=>this.setMobileShow(false)} placement="end">
                    <Offcanvas.Header closeButton>
                        <Offcanvas.Title>Filter</Offcanvas.Title>
                    </Offcanvas.Header>
                    <Offcanvas.Body>
                        <div className="d-flex flex-column">
                            <div class="mb-2">
                                <Typeahead
                                    id="rendering-example"
                                    labelKey="region"
                                    options={search_data}
                                    placeholder="Cari Wilayah ..."
                                    maxResults={10}
                                    onChange={e=>{
                                        if(e.length>0){
                                            if(this.state.map==null) return

                                            this.state.map.setView([e[0].map_center.latitude, e[0].map_center.longitude], e[0].map_center.zoom)
                                        }
                                    }}
                                    renderMenuItemChildren={(option, {text})=>{
                                        return (
                                            <>
                                                <Highlighter search={text} highlightClassName="pe-0">{option.region}</Highlighter>
                                                <div className="text-muted overflow-hidden" style={{textOverflow:"ellipsis"}}>
                                                    <small>
                                                        {option.kabupaten_kota}, {' '}
                                                        {option.provinsi}
                                                    </small>
                                                </div>
                                            </>
                                        )
                                    }}
                                    
                                />
                            </div>
                            <div className="mb-2">
                                <Select
                                    options={this.month}
                                    styles={{
                                        container:(baseStyles, state)=>({
                                            ...baseStyles,
                                            zIndex:10
                                        })
                                    }}
                                    value={this.month.find(f=>f.value==bulan)}
                                    onChange={e=>this.typeBulan(e)}
                                    placeholder="Pilih Bulan"
                                    isSearchable
                                />
                            </div>
                            <div className="mb-2">
                                <CreatableSelect
                                    options={this.tahun_options()}
                                    onChange={e=>this.typeTahun(e)}
                                    value={this.tahun_options().find(f=>f.value==tahun)}
                                    placeholder="Pilih Tahun"
                                    styles={{
                                        container:(baseStyles, state)=>({
                                            ...baseStyles,
                                            zIndex:9
                                        })
                                    }}
                                />
                            </div>
                        </div>
                    </Offcanvas.Body>
                </Offcanvas>

                {/* MODAL */}
                <Modal show={detail.is_open} onHide={()=>this.toggleDetail()} backdrop="static" scrollable>
                    <Modal.Header closeButton>
                        <h4 className="modal-title">Detail Lokasi</h4>
                    </Modal.Header>
                    <Modal.Body>
                        <table cellPadding="5">
                            <tr>
                                <th width="180">Provinsi</th>
                                <td width="10">:</td>
                                <td>{detail.data?.provinsi}</td>
                            </tr>
                            <tr>
                                <th width="180">Kabupaten/Kota</th>
                                <td width="10">:</td>
                                <td>{detail.data?.kabupaten_kota}</td>
                            </tr>
                            <tr>
                                <th valign="top" width="180">Kecamatan</th>
                                <td valign="top" width="10">:</td>
                                <td>{detail.data?.region}</td>
                            </tr>
                            <tr>
                                <th valign="top" width="180">Curah Hujan</th>
                                <td valign="top" width="10">:</td>
                                <td>{detail.data?.curah_hujan}</td>
                            </tr>
                            <tr>
                                <th valign="top" width="180">Curah Hujan Normal</th>
                                <td valign="top" width="10">:</td>
                                <td>{detail.data?.curah_hujan_normal}</td>
                            </tr>
                            <tr>
                                <th valign="top" width="180">Sifat Hujan</th>
                                <td valign="top" width="10">:</td>
                                <td><span dangerouslySetInnerHTML={{__html:this.sifatHujan(detail.data?.curah_hujan, detail.data?.curah_hujan_normal)}}/></td>
                            </tr>
                            <tr>
                                <th valign="top" width="180">Sifat Bulan</th>
                                <td valign="top" width="10">:</td>
                                <td><span dangerouslySetInnerHTML={{__html:this.sifatBulan(detail.data?.curah_hujan)}}/></td>
                            </tr>
                            <tr>
                                <th valign="top" width="180">Banjir</th>
                                <td valign="top" width="10">:</td>
                                <td><span dangerouslySetInnerHTML={{__html:this.valueBanjir(detail.data?.curah_hujan)}}/></td>
                            </tr>
                        </table>
                    </Modal.Body>
                    <Modal.Footer className="mt-3 border-top pt-2">
                        <button 
                            type="button" 
                            className="btn btn-link text-gray me-auto" 
                            onClick={e=>this.toggleDetail()}
                        >
                            Tutup
                        </button>
                    </Modal.Footer>
                </Modal>

                <MenuSidebar
                    show_menu={show_menu}
                    setShowMenu={this.setShowMenu}
                    pengaturan={this.props.pengaturan}
                    setCollapse={this.setCollapse}
                    collapse={collapse}
                />

                <ToastApp/>
            </>
        )
    }
}

export default Frontpage